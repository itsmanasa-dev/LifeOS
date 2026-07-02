import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SyllabusItem } from '../types';

interface StudyStoreState {
  streak: number;
  targetDurationMinutes: number;
  secondsRemaining: number;
  isRunning: boolean;
  syllabus: SyllabusItem[];
  isLoading: boolean;
  
  // Timer internal
  timerIntervalId: any | null;

  loadStudyData: (userId: string) => Promise<void>;
  setDuration: (userId: string, minutes: number) => Promise<void>;
  startTimer: (userId: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  updateSyllabusProgress: (userId: string, name: string, progress: number) => Promise<void>;
  addSyllabusItem: (userId: string, item: SyllabusItem) => Promise<void>;
  deleteSyllabusItem: (userId: string, name: string) => Promise<void>;
  clear: () => void;
}

export const useStudyStore = create<StudyStoreState>((set, get) => ({
  streak: 42,
  targetDurationMinutes: 45,
  secondsRemaining: 45 * 60,
  isRunning: false,
  syllabus: [],
  isLoading: false,
  timerIntervalId: null,

  loadStudyData: async (userId) => {
    set({ isLoading: true });
    try {
      const docRef = doc(db, 'study_tracker', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        set({
          streak: data.streak ?? 42,
          targetDurationMinutes: data.targetDurationMinutes ?? 45,
          secondsRemaining: get().isRunning 
            ? get().secondsRemaining 
            : (data.targetDurationMinutes ?? 45) * 60,
          syllabus: data.syllabus || [],
          isLoading: false
        });
      } else {
        // Seed default stats
        const defaultSyllabus: SyllabusItem[] = [
          { name: 'History & Culture', progress: 0.78, colorHex: '#6366F1' },
          { name: 'Quantitative Aptitude', progress: 0.45, colorHex: '#10B981' },
          { name: 'Polity & Governance', progress: 0.92, colorHex: '#F59E0B' },
        ];
        const defaultData = {
          streak: 42,
          targetDurationMinutes: 45,
          syllabus: defaultSyllabus,
        };
        await setDoc(docRef, defaultData);
        set({
          streak: 42,
          targetDurationMinutes: 45,
          secondsRemaining: 45 * 60,
          syllabus: defaultSyllabus,
          isLoading: false
        });
      }
    } catch (err: any) {
      console.error('Error loading study tracker:', err);
      set({ isLoading: false });
    }
  },

  setDuration: async (userId, minutes) => {
    if (get().isRunning) return;
    try {
      set({
        targetDurationMinutes: minutes,
        secondsRemaining: minutes * 60,
      });

      const docRef = doc(db, 'study_tracker', userId);
      await setDoc(docRef, { targetDurationMinutes: minutes }, { merge: true });
    } catch (err) {
      console.error('Error setting duration:', err);
    }
  },

  startTimer: (userId) => {
    if (get().isRunning) return;

    const intervalId = setInterval(async () => {
      const remaining = get().secondsRemaining;
      if (remaining > 0) {
        set({ secondsRemaining: remaining - 1 });
      } else {
        // Timer completed!
        const activeInterval = get().timerIntervalId;
        if (activeInterval) clearInterval(activeInterval);

        const nextStreak = get().streak + 1;
        const target = get().targetDurationMinutes;
        
        set({
          isRunning: false,
          timerIntervalId: null,
          streak: nextStreak,
          secondsRemaining: target * 60,
        });

        // Sync streak increments to Firestore
        try {
          const docRef = doc(db, 'study_tracker', userId);
          await setDoc(docRef, { streak: nextStreak }, { merge: true });
        } catch (err) {
          console.error('Error syncing completed streak:', err);
        }
      }
    }, 1000);

    set({ isRunning: true, timerIntervalId: intervalId });
  },

  pauseTimer: () => {
    const activeInterval = get().timerIntervalId;
    if (activeInterval) {
      clearInterval(activeInterval);
      set({ isRunning: false, timerIntervalId: null });
    }
  },

  resetTimer: () => {
    const activeInterval = get().timerIntervalId;
    if (activeInterval) {
      clearInterval(activeInterval);
    }
    set({
      isRunning: false,
      timerIntervalId: null,
      secondsRemaining: get().targetDurationMinutes * 60,
    });
  },

  updateSyllabusProgress: async (userId, name, progress) => {
    try {
      const current = get().syllabus;
      const clamped = Math.max(0, Math.min(1, progress));
      const updated = current.map((item) =>
        item.name === name ? { ...item, progress: clamped } : item
      );

      set({ syllabus: updated });

      const docRef = doc(db, 'study_tracker', userId);
      await setDoc(docRef, { syllabus: updated }, { merge: true });
    } catch (err) {
      console.error('Error updating syllabus:', err);
    }
  },

  addSyllabusItem: async (userId, item) => {
    try {
      const current = get().syllabus;
      const updated = [...current, item];
      set({ syllabus: updated });

      const docRef = doc(db, 'study_tracker', userId);
      await setDoc(docRef, { syllabus: updated }, { merge: true });
    } catch (err) {
      console.error('Error adding syllabus item:', err);
    }
  },

  deleteSyllabusItem: async (userId, name) => {
    try {
      const current = get().syllabus;
      const updated = current.filter((item) => item.name !== name);
      set({ syllabus: updated });

      const docRef = doc(db, 'study_tracker', userId);
      await setDoc(docRef, { syllabus: updated }, { merge: true });
    } catch (err) {
      console.error('Error deleting syllabus item:', err);
    }
  },

  clear: () => {
    const activeInterval = get().timerIntervalId;
    if (activeInterval) clearInterval(activeInterval);
    set({
      streak: 42,
      targetDurationMinutes: 45,
      secondsRemaining: 45 * 60,
      isRunning: false,
      syllabus: [],
      timerIntervalId: null,
    });
  },
}));
