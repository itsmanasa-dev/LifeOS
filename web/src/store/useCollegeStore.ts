import { create } from 'zustand';
import { collection, query, where, getDocs, doc, writeBatch, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { TimetableEntry } from '../types';

export interface TimetableDocument {
  id: string;
  userId: string;
  semester: string;
  uploadedDate: string;
  originalImageUrl: string;
  status: 'active' | 'archived';
  subjects: string[];
  timings: string[];
  days: number[];
  labs: string[];
}

interface CollegeStoreState {
  timetable: TimetableEntry[];
  activeSemester: string | null;
  uploadedDate: string | null;
  originalImageUrl: string | null;
  activeTimetableId: string | null;
  isLoading: boolean;
  error: string | null;

  loadTimetable: (userId: string) => Promise<void>;
  importTimetable: (
    userId: string,
    entries: TimetableEntry[],
    semester: string,
    imageUrl: string
  ) => Promise<void>;
  upsertEntry: (userId: string, entry: TimetableEntry) => Promise<void>;
  deleteEntry: (userId: string, id: string) => Promise<void>;
  getTodayEntries: () => TimetableEntry[];
  clear: () => void;
}

const computeMetadata = (slots: TimetableEntry[]) => {
  const subjects = Array.from(new Set(slots.map(s => s.subjectName)));
  const timings = Array.from(new Set(slots.map(s => `${s.startTime} - ${s.endTime}`)));
  const days = Array.from(new Set(slots.map(s => s.dayOfWeek)));
  const labs = Array.from(new Set(slots.filter(s => s.type === 'Lab').map(s => s.subjectName)));
  return { subjects, timings, days, labs };
};

const daysOfWeekNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const useCollegeStore = create<CollegeStoreState>((set, get) => ({
  timetable: [],
  activeSemester: null,
  uploadedDate: null,
  originalImageUrl: null,
  activeTimetableId: null,
  isLoading: false,
  error: null,

  loadTimetable: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const q = query(
        collection(db, 'users', userId, 'timetable'),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      
      let activeDoc: TimetableDocument | null = null;
      querySnapshot.forEach((docSnap) => {
        activeDoc = { id: docSnap.id, ...docSnap.data() } as TimetableDocument;
      });

      if (activeDoc) {
        const docData = activeDoc as TimetableDocument;
        
        // Fetch slots subcollection: users/{userId}/timetable/{activeSemester}/slots
        const slotsSnapshot = await getDocs(
          collection(db, 'users', userId, 'timetable', docData.semester, 'slots')
        );
        
        const entries: TimetableEntry[] = [];
        slotsSnapshot.forEach((slotDoc) => {
          const s = slotDoc.data();
          entries.push({
            id: slotDoc.id,
            subjectName: s.subjectName || s.subject || '',
            subjectColor: s.subjectColor || '#6366F1',
            startTime: s.startTime || '',
            endTime: s.endTime || '',
            room: s.room || '',
            teacher: s.teacher || '',
            dayOfWeek: s.dayOfWeek || 1,
            day: s.day || 'Monday',
            type: s.type || 'Lecture',
            confidence: s.confidence !== undefined ? s.confidence : 100,
            lowConfidenceFields: s.lowConfidenceFields || [],
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          });
        });

        entries.sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) {
            return a.dayOfWeek - b.dayOfWeek;
          }
          return a.startTime.localeCompare(b.startTime);
        });

        set({
          timetable: entries,
          activeSemester: docData.semester,
          uploadedDate: docData.uploadedDate,
          originalImageUrl: docData.originalImageUrl,
          activeTimetableId: docData.semester,
          isLoading: false,
        });
      } else {
        set({
          timetable: [],
          activeSemester: null,
          uploadedDate: null,
          originalImageUrl: null,
          activeTimetableId: null,
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.error('Error loading timetable:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  importTimetable: async (userId, entries, semester, imageUrl) => {
    set({ isLoading: true, error: null });
    try {
      const batch = writeBatch(db);

      // 1. Archive existing active timetables in users/{uid}/timetable
      const q = query(
        collection(db, 'users', userId, 'timetable'),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { status: 'archived' });
        // Archive in root timetables collection if it exists there
        const rootDocRef = doc(db, 'timetables', docSnap.id);
        batch.update(rootDocRef, { status: 'archived' });
      });

      // 2. Create the new timetable semester document
      const { subjects, timings, days, labs } = computeMetadata(entries);

      const timetableDoc: TimetableDocument = {
        id: semester,
        userId,
        semester,
        uploadedDate: new Date().toISOString(),
        originalImageUrl: imageUrl,
        status: 'active',
        subjects,
        timings,
        days,
        labs,
      };

      // Store in users subcollection users/{uid}/timetable/{semester}
      const userSubDocRef = doc(db, 'users', userId, 'timetable', semester);
      batch.set(userSubDocRef, timetableDoc);

      // Store in root collection timetables/{semester}
      const rootDocRef = doc(db, 'timetables', semester);
      batch.set(rootDocRef, timetableDoc);

      // 3. Write slots into users/{uid}/timetable/{semester}/slots/{slotId}
      for (const entry of entries) {
        const slotRef = doc(db, 'users', userId, 'timetable', semester, 'slots', entry.id);
        const dayName = daysOfWeekNames[entry.dayOfWeek] || 'Monday';
        batch.set(slotRef, {
          day: dayName,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          subject: entry.subjectName,
          subjectName: entry.subjectName,
          subjectColor: entry.subjectColor,
          room: entry.room || '',
          teacher: entry.teacher || '',
          confidence: entry.confidence ?? 100,
          createdAt: entry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: entry.type,
          lowConfidenceFields: entry.lowConfidenceFields || []
        });
      }

      await batch.commit();

      const sorted = [...entries].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.startTime.localeCompare(b.startTime);
      });

      set({
        timetable: sorted,
        activeSemester: semester,
        uploadedDate: timetableDoc.uploadedDate,
        originalImageUrl: imageUrl,
        activeTimetableId: semester,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Error importing timetable:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  upsertEntry: async (userId, entry) => {
    try {
      const activeSem = get().activeSemester;
      if (!activeSem) {
        throw new Error('No active semester found to update.');
      }

      const currentSlots = [...get().timetable];
      const index = currentSlots.findIndex((s) => s.id === entry.id);
      if (index >= 0) {
        currentSlots[index] = entry;
      } else {
        currentSlots.push(entry);
      }

      const { subjects, timings, days, labs } = computeMetadata(currentSlots);

      // 1. Update the slot document: users/{uid}/timetable/{semester}/slots/{slotId}
      const dayName = daysOfWeekNames[entry.dayOfWeek] || 'Monday';
      const slotRef = doc(db, 'users', userId, 'timetable', activeSem, 'slots', entry.id);
      await setDoc(slotRef, {
        day: dayName,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subject: entry.subjectName,
        subjectName: entry.subjectName,
        subjectColor: entry.subjectColor,
        room: entry.room || '',
        teacher: entry.teacher || '',
        confidence: entry.confidence ?? 100,
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: entry.type,
        lowConfidenceFields: entry.lowConfidenceFields || []
      });

      // 2. Update metadata in semester document: users/{uid}/timetable/{semester}
      const userSubDocRef = doc(db, 'users', userId, 'timetable', activeSem);
      await updateDoc(userSubDocRef, {
        subjects,
        timings,
        days,
        labs,
      });

      // Update root metadata too
      const rootDocRef = doc(db, 'timetables', activeSem);
      await updateDoc(rootDocRef, {
        subjects,
        timings,
        days,
        labs,
      });

      currentSlots.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.startTime.localeCompare(b.startTime);
      });

      set({ timetable: currentSlots });
    } catch (err: any) {
      console.error('Error upserting entry:', err);
      throw err;
    }
  },

  deleteEntry: async (userId, id) => {
    try {
      const activeSem = get().activeSemester;
      if (!activeSem) {
        throw new Error('No active semester found to delete entry from.');
      }

      // 1. Delete the slot document: users/{uid}/timetable/{semester}/slots/{slotId}
      const slotRef = doc(db, 'users', userId, 'timetable', activeSem, 'slots', id);
      await deleteDoc(slotRef);

      const currentSlots = get().timetable.filter((s) => s.id !== id);
      const { subjects, timings, days, labs } = computeMetadata(currentSlots);

      // 2. Update metadata in semester document: users/{uid}/timetable/{semester}
      const userSubDocRef = doc(db, 'users', userId, 'timetable', activeSem);
      await updateDoc(userSubDocRef, {
        subjects,
        timings,
        days,
        labs,
      });

      // Update root metadata too
      const rootDocRef = doc(db, 'timetables', activeSem);
      await updateDoc(rootDocRef, {
        subjects,
        timings,
        days,
        labs,
      });

      set({ timetable: currentSlots });
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      throw err;
    }
  },

  getTodayEntries: () => {
    const jsDay = new Date().getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    return get().timetable
      .filter((entry) => entry.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  clear: () => set({
    timetable: [],
    activeSemester: null,
    uploadedDate: null,
    originalImageUrl: null,
    activeTimetableId: null,
    isLoading: false,
    error: null,
  }),
}));;
