import { create } from 'zustand';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AttendanceSubject, AttendanceRecord, TimetableEntry } from '../types';

interface AttendanceStoreState {
  subjects: AttendanceSubject[];
  records: AttendanceRecord[];
  isLoading: boolean;
  error: string | null;

  loadAttendance: (userId: string) => Promise<void>;
  syncSubjectsFromTimetable: (userId: string, timetable: TimetableEntry[], keepHistory: boolean) => Promise<void>;
  logAttendance: (userId: string, subjectName: string, isPresent: boolean, date: string, type: 'Lecture' | 'Lab') => Promise<void>;
  toggleRecordStatus: (recordId: string) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  addSubject: (userId: string, name: string, color: string, targetPercentage?: number) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  
  getSubjectsWithStats: () => AttendanceSubject[];
  getOverallStats: () => {
    percentage: number;
    attended: number;
    absent: number;
    total: number;
    theory: number;
    labs: number;
  };
  clear: () => void;
}

export const useAttendanceStore = create<AttendanceStoreState>((set, get) => ({
  subjects: [],
  records: [],
  isLoading: false,
  error: null,

  loadAttendance: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Fetch subjects
      const qSub = query(collection(db, 'subjects'), where('userId', '==', userId));
      const subSnapshot = await getDocs(qSub);
      const subjectsList: AttendanceSubject[] = [];
      subSnapshot.forEach((docSnap) => {
        subjectsList.push(docSnap.data() as AttendanceSubject);
      });

      // 2. Fetch records
      const qRec = query(collection(db, 'attendance_records'), where('userId', '==', userId));
      const recSnapshot = await getDocs(qRec);
      const recordsList: AttendanceRecord[] = [];
      recSnapshot.forEach((docSnap) => {
        recordsList.push(docSnap.data() as AttendanceRecord);
      });

      set({ subjects: subjectsList, records: recordsList, isLoading: false });
    } catch (err: any) {
      console.error('Error loading attendance data:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  syncSubjectsFromTimetable: async (userId, timetable, keepHistory) => {
    set({ isLoading: true, error: null });
    try {
      const batch = writeBatch(db);

      // 1. If reset logs, delete records
      if (!keepHistory) {
        const qRec = query(collection(db, 'attendance_records'), where('userId', '==', userId));
        const recSnapshot = await getDocs(qRec);
        recSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        set({ records: [] });
      }

      // 2. Compute unique subjects from timetable
      const uniqueNames = new Set<string>();
      const nameToColor: Record<string, string> = {};
      timetable.forEach((entry) => {
        uniqueNames.add(entry.subjectName);
        nameToColor[entry.subjectName] = entry.subjectColor;
      });

      const currentSubjects = get().subjects;
      const currentRecords = !keepHistory ? [] : get().records;
      const finalSubjects: AttendanceSubject[] = [];

      // Determine which subjects to retain
      currentSubjects.forEach((sub) => {
        const existsInTimetable = uniqueNames.has(sub.name);
        const hasHistory = currentRecords.some((r) => r.subjectId === sub.id);

        if (existsInTimetable || (keepHistory && hasHistory)) {
          finalSubjects.push(sub);
          uniqueNames.delete(sub.name); // Already added
        } else {
          // Remove from database
          const docRef = doc(db, 'subjects', sub.id);
          batch.delete(docRef);
        }
      });

      // Create new subjects for remaining names in the timetable
      uniqueNames.forEach((name) => {
        const newSubId = `subj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newSub: AttendanceSubject & { userId: string } = {
          id: newSubId,
          name,
          color: nameToColor[name] || '#6366F1',
          targetPercentage: 75,
          attendedCount: 0,
          totalCount: 0,
          userId,
        };
        const docRef = doc(db, 'subjects', newSubId);
        batch.set(docRef, newSub);
        finalSubjects.push(newSub);
      });

      await batch.commit();
      set({ subjects: finalSubjects, isLoading: false });
    } catch (err: any) {
      console.error('Error syncing subjects:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logAttendance: async (userId, subjectName, isPresent, date, type) => {
    try {
      const subject = get().subjects.find(
        (s) => s.name.toLowerCase() === subjectName.toLowerCase()
      );
      if (!subject) return;

      const recordId = `record-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const newRecord: AttendanceRecord & { userId: string } = {
        id: recordId,
        subjectId: subject.id,
        date,
        status: isPresent ? 'present' : 'absent',
        type,
        userId,
      };

      const docRef = doc(db, 'attendance_records', recordId);
      await setDoc(docRef, newRecord);

      set((state) => ({
        records: [...state.records, newRecord],
      }));
    } catch (err: any) {
      console.error('Error logging attendance:', err);
      throw err;
    }
  },

  toggleRecordStatus: async (recordId) => {
    try {
      const current = get().records.find((r) => r.id === recordId);
      if (!current) return;

      const newStatus = current.status === 'present' ? 'absent' : 'present';
      const docRef = doc(db, 'attendance_records', recordId);
      await updateDoc(docRef, { status: newStatus });

      set((state) => ({
        records: state.records.map((r) =>
          r.id === recordId ? { ...r, status: newStatus as 'present' | 'absent' } : r
        ),
      }));
    } catch (err: any) {
      console.error('Error toggling record status:', err);
      throw err;
    }
  },

  deleteRecord: async (recordId) => {
    try {
      const docRef = doc(db, 'attendance_records', recordId);
      await deleteDoc(docRef);

      set((state) => ({
        records: state.records.filter((r) => r.id !== recordId),
      }));
    } catch (err: any) {
      console.error('Error deleting record:', err);
      throw err;
    }
  },

  addSubject: async (userId, name, color, targetPercentage = 75) => {
    try {
      const subId = `subj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const newSub: AttendanceSubject & { userId: string } = {
        id: subId,
        name,
        color,
        targetPercentage,
        attendedCount: 0,
        totalCount: 0,
        userId,
      };

      const docRef = doc(db, 'subjects', subId);
      await setDoc(docRef, newSub);

      set((state) => ({
        subjects: [...state.subjects, newSub],
      }));
    } catch (err: any) {
      console.error('Error adding subject:', err);
      throw err;
    }
  },

  deleteSubject: async (subjectId) => {
    try {
      const batch = writeBatch(db);
      // Delete subject
      const subRef = doc(db, 'subjects', subjectId);
      batch.delete(subRef);

      // Delete all matching records
      const matchingRecords = get().records.filter((r) => r.subjectId === subjectId);
      matchingRecords.forEach((r) => {
        const recRef = doc(db, 'attendance_records', r.id);
        batch.delete(recRef);
      });

      await batch.commit();

      set((state) => ({
        subjects: state.subjects.filter((s) => s.id !== subjectId),
        records: state.records.filter((r) => r.subjectId !== subjectId),
      }));
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      throw err;
    }
  },

  getSubjectsWithStats: () => {
    const { subjects, records } = get();
    return subjects.map((sub) => {
      const subRecords = records.filter((r) => r.subjectId === sub.id);
      const attended = subRecords.filter((r) => r.status === 'present').length;
      const total = subRecords.length;

      return {
        ...sub,
        attendedCount: attended,
        totalCount: total,
      };
    });
  },

  getOverallStats: () => {
    const { records } = get();
    const total = records.length;
    if (total === 0) {
      return { percentage: 100, attended: 0, absent: 0, total: 0, theory: 0, labs: 0 };
    }

    const attended = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const theory = records.filter((r) => r.type === 'Lecture').length;
    const labs = records.filter((r) => r.type === 'Lab').length;
    const percentage = (attended / total) * 100;

    return { percentage, attended, absent, total, theory, labs };
  },

  clear: () => set({ subjects: [], records: [], isLoading: false, error: null }),
}));
