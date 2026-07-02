import { create } from 'zustand';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { TimetableEntry } from '../types';

interface CollegeStoreState {
  timetable: TimetableEntry[];
  isLoading: boolean;
  error: string | null;

  loadTimetable: (userId: string) => Promise<void>;
  importTimetable: (userId: string, entries: TimetableEntry[]) => Promise<void>;
  upsertEntry: (userId: string, entry: TimetableEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getTodayEntries: () => TimetableEntry[];
  clear: () => void;
}

export const useCollegeStore = create<CollegeStoreState>((set, get) => ({
  timetable: [],
  isLoading: false,
  error: null,

  loadTimetable: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const q = query(collection(db, 'timetable'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const entries: TimetableEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as TimetableEntry);
      });
      // Sort timetable entries by dayOfWeek and startTime
      entries.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.startTime.localeCompare(b.startTime);
      });
      set({ timetable: entries, isLoading: false });
    } catch (err: any) {
      console.error('Error loading timetable:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  importTimetable: async (userId, entries) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Delete all existing timetable entries for the user
      const q = query(collection(db, 'timetable'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // 2. Set new entries
      const setBatch = writeBatch(db);
      const mappedEntries = entries.map((entry) => ({
        ...entry,
        userId,
      }));

      mappedEntries.forEach((entry) => {
        const docRef = doc(db, 'timetable', entry.id);
        setBatch.set(docRef, entry);
      });
      await setBatch.commit();

      // 3. Update local state
      const sorted = [...entries].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.startTime.localeCompare(b.startTime);
      });
      set({ timetable: sorted, isLoading: false });
    } catch (err: any) {
      console.error('Error importing timetable:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  upsertEntry: async (userId, entry) => {
    try {
      const docRef = doc(db, 'timetable', entry.id);
      const entryWithUser = { ...entry, userId };
      await setDoc(docRef, entryWithUser, { merge: true });

      const currentEntries = get().timetable;
      const index = currentEntries.findIndex((e) => e.id === entry.id);
      const newEntries = [...currentEntries];
      if (index >= 0) {
        newEntries[index] = entry;
      } else {
        newEntries.push(entry);
      }
      newEntries.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.startTime.localeCompare(b.startTime);
      });
      set({ timetable: newEntries });
    } catch (err: any) {
      console.error('Error upserting entry:', err);
      throw err;
    }
  },

  deleteEntry: async (id) => {
    try {
      const docRef = doc(db, 'timetable', id);
      await deleteDoc(docRef);

      const currentEntries = get().timetable;
      set({
        timetable: currentEntries.filter((e) => e.id !== id),
      });
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      throw err;
    }
  },

  getTodayEntries: () => {
    // JS: 0 = Sunday, 1 = Monday...
    // Flutter: 1 = Monday, 7 = Sunday
    const jsDay = new Date().getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    return get().timetable
      .filter((entry) => entry.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  clear: () => set({ timetable: [], isLoading: false, error: null }),
}));
