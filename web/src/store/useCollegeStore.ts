import { create } from 'zustand';
import { collection, query, where, getDocs, doc, writeBatch, updateDoc } from 'firebase/firestore';
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
  slots: TimetableEntry[];
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
        activeDoc = docSnap.data() as TimetableDocument;
      });

      if (activeDoc) {
        const docData = activeDoc as TimetableDocument;
        const entries = [...docData.slots];
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
          activeTimetableId: docData.id,
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

      // 1. Archive existing active timetables
      const q = query(
        collection(db, 'users', userId, 'timetable'),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        // Archive in users subcollection
        batch.update(docSnap.ref, { status: 'archived' });
        // Archive in root timetables collection
        const rootDocRef = doc(db, 'timetables', docSnap.id);
        batch.update(rootDocRef, { status: 'archived' });
      });

      // 2. Create the new timetable document
      const newTimetableId = `tt-${Date.now()}`;
      const { subjects, timings, days, labs } = computeMetadata(entries);

      const timetableDoc: TimetableDocument = {
        id: newTimetableId,
        userId,
        semester,
        uploadedDate: new Date().toISOString(),
        originalImageUrl: imageUrl,
        status: 'active',
        subjects,
        timings,
        days,
        labs,
        slots: entries,
      };

      // Store in users subcollection users/{uid}/timetable/{id}
      const userSubDocRef = doc(db, 'users', userId, 'timetable', newTimetableId);
      batch.set(userSubDocRef, timetableDoc);

      // Store in root collection timetables/{id}
      const rootDocRef = doc(db, 'timetables', newTimetableId);
      batch.set(rootDocRef, timetableDoc);

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
        activeTimetableId: newTimetableId,
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
      const activeId = get().activeTimetableId;
      if (!activeId) {
        throw new Error('No active timetable found to update.');
      }

      const currentSlots = [...get().timetable];
      const index = currentSlots.findIndex((s) => s.id === entry.id);
      if (index >= 0) {
        currentSlots[index] = entry;
      } else {
        currentSlots.push(entry);
      }

      const { subjects, timings, days, labs } = computeMetadata(currentSlots);

      // Update users/{uid}/timetable/{id}
      const userSubDocRef = doc(db, 'users', userId, 'timetable', activeId);
      await updateDoc(userSubDocRef, {
        slots: currentSlots,
        subjects,
        timings,
        days,
        labs,
      });

      // Update timetables/{id}
      const rootDocRef = doc(db, 'timetables', activeId);
      await updateDoc(rootDocRef, {
        slots: currentSlots,
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
      const activeId = get().activeTimetableId;
      if (!activeId) {
        throw new Error('No active timetable found to delete entry from.');
      }

      const currentSlots = get().timetable.filter((s) => s.id !== id);
      const { subjects, timings, days, labs } = computeMetadata(currentSlots);

      // Update users/{uid}/timetable/{id}
      const userSubDocRef = doc(db, 'users', userId, 'timetable', activeId);
      await updateDoc(userSubDocRef, {
        slots: currentSlots,
        subjects,
        timings,
        days,
        labs,
      });

      // Update timetables/{id}
      const rootDocRef = doc(db, 'timetables', activeId);
      await updateDoc(rootDocRef, {
        slots: currentSlots,
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
