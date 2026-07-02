import { create } from 'zustand';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { TaskModel, HabitModel, HabitLog, GoalModel, NoteModel, CalendarEvent } from '../types';

interface PlannerStoreState {
  // Tasks state
  tasks: TaskModel[];
  isLoadingTasks: boolean;
  
  // Habits state
  habits: HabitModel[];
  habitLogs: HabitLog[];
  isLoadingHabits: boolean;
  
  // Goals state
  goals: GoalModel[];
  isLoadingGoals: boolean;
  
  // Notes state
  notes: NoteModel[];
  isLoadingNotes: boolean;

  // Calendar events state
  calendarEvents: CalendarEvent[];
  isLoadingEvents: boolean;
  
  error: string | null;

  // Tasks actions
  loadTasks: (userId: string) => Promise<void>;
  upsertTask: (userId: string, task: TaskModel) => Promise<void>;
  toggleComplete: (userId: string, taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Habits actions
  loadHabits: (userId: string) => Promise<void>;
  loadHabitLogs: (userId: string, dateStr: string) => Promise<void>;
  toggleHabit: (userId: string, habitId: string, dateStr: string) => Promise<void>;
  addHabit: (userId: string, habit: HabitModel) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;

  // Goals actions
  loadGoals: (userId: string) => Promise<void>;
  upsertGoal: (userId: string, goal: GoalModel) => Promise<void>;
  toggleGoal: (goalId: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  // Notes actions
  loadNotes: (userId: string) => Promise<void>;
  upsertNote: (userId: string, note: NoteModel) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

  // Calendar actions
  loadEvents: (userId: string) => Promise<void>;
  upsertEvent: (userId: string, event: CalendarEvent) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;

  clear: () => void;
}

export const usePlannerStore = create<PlannerStoreState>((set, get) => ({
  tasks: [],
  isLoadingTasks: false,
  
  habits: [],
  habitLogs: [],
  isLoadingHabits: false,
  
  goals: [],
  isLoadingGoals: false,
  
  notes: [],
  isLoadingNotes: false,

  calendarEvents: [],
  isLoadingEvents: false,

  error: null,

  // --------------------------------------------------
  // TASKS
  // --------------------------------------------------
  loadTasks: async (userId) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const q = query(collection(db, 'tasks'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const list: TaskModel[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TaskModel);
      });
      list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      set({ tasks: list, isLoadingTasks: false });
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      set({ error: err.message, isLoadingTasks: false });
    }
  },

  upsertTask: async (userId, task) => {
    try {
      const docRef = doc(db, 'tasks', task.id);
      const taskWithUser = { ...task, userId };
      await setDoc(docRef, taskWithUser, { merge: true });

      const current = get().tasks;
      const index = current.findIndex((t) => t.id === task.id);
      const updated = [...current];
      if (index >= 0) {
        updated[index] = task;
      } else {
        updated.push(task);
      }
      updated.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      set({ tasks: updated });
    } catch (err: any) {
      console.error('Error saving task:', err);
      throw err;
    }
  },

  toggleComplete: async (_userId, taskId) => {
    try {
      const current = get().tasks;
      const task = current.find((t) => t.id === taskId);
      if (!task) return;

      const updatedStatus = !task.isCompleted;
      const docRef = doc(db, 'tasks', taskId);
      await updateDoc(docRef, { isCompleted: updatedStatus });

      set({
        tasks: current.map((t) =>
          t.id === taskId ? { ...t, isCompleted: updatedStatus } : t
        ),
      });
    } catch (err: any) {
      console.error('Error toggling task completion:', err);
      throw err;
    }
  },

  deleteTask: async (taskId) => {
    try {
      const docRef = doc(db, 'tasks', taskId);
      await deleteDoc(docRef);

      const current = get().tasks;
      set({
        tasks: current.filter((t) => t.id !== taskId),
      });
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw err;
    }
  },

  // --------------------------------------------------
  // HABITS
  // --------------------------------------------------
  loadHabits: async (userId) => {
    set({ isLoadingHabits: true, error: null });
    try {
      const q = query(collection(db, 'habits'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      let list: HabitModel[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as HabitModel);
      });

      // Seed default habits if user has none
      if (list.length === 0) {
        const defaultHabits: HabitModel[] = [
          { id: 'habit-1', name: 'Drink Water', icon: '💧', color: '#06B6D4', isActive: true },
          { id: 'habit-2', name: 'Exercise', icon: '🏃', color: '#10B981', isActive: true },
          { id: 'habit-3', name: 'Reading', icon: '📚', color: '#8B5CF6', isActive: true },
          { id: 'habit-4', name: 'Meditation', icon: '🧘', color: '#F59E0B', isActive: true },
        ];
        const batch = writeBatch(db);
        defaultHabits.forEach((h) => {
          const docRef = doc(db, 'habits', h.id);
          batch.set(docRef, { ...h, userId });
        });
        await batch.commit();
        list = defaultHabits;
      }
      set({ habits: list, isLoadingHabits: false });
    } catch (err: any) {
      console.error('Error loading habits:', err);
      set({ error: err.message, isLoadingHabits: false });
    }
  },

  loadHabitLogs: async (userId, dateStr) => {
    try {
      const q = query(
        collection(db, 'habit_logs'),
        where('userId', '==', userId),
        where('date', '==', dateStr)
      );
      const querySnapshot = await getDocs(q);
      const logs: HabitLog[] = [];
      querySnapshot.forEach((docSnap) => {
        logs.push(docSnap.data() as HabitLog);
      });
      set({ habitLogs: logs });
    } catch (err: any) {
      console.error('Error loading habit logs:', err);
    }
  },

  toggleHabit: async (userId, habitId, dateStr) => {
    try {
      const currentLogs = get().habitLogs;
      const existing = currentLogs.find((l) => l.habitId === habitId);
      const newStatus = existing ? !existing.isCompleted : true;
      
      const logId = `${habitId}-${dateStr}`;
      const docRef = doc(db, 'habit_logs', logId);
      
      const newLog: HabitLog & { userId: string } = {
        habitId,
        date: dateStr,
        isCompleted: newStatus,
        userId,
      };

      await setDoc(docRef, newLog);

      if (existing) {
        set({
          habitLogs: currentLogs.map((l) =>
            l.habitId === habitId ? { ...l, isCompleted: newStatus } : l
          ),
        });
      } else {
        set({
          habitLogs: [...currentLogs, newLog],
        });
      }
    } catch (err: any) {
      console.error('Error toggling habit:', err);
      throw err;
    }
  },

  addHabit: async (userId, habit) => {
    try {
      const docRef = doc(db, 'habits', habit.id);
      await setDoc(docRef, { ...habit, userId });
      set((state) => ({ habits: [...state.habits, habit] }));
    } catch (err: any) {
      console.error('Error adding habit:', err);
      throw err;
    }
  },

  deleteHabit: async (habitId) => {
    try {
      // 1. Delete habit definition
      const docRef = doc(db, 'habits', habitId);
      await deleteDoc(docRef);

      // 2. Delete logs in Firestore (optionally batch delete, but we just update local state first)
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== habitId),
        habitLogs: state.habitLogs.filter((l) => l.habitId !== habitId),
      }));
    } catch (err: any) {
      console.error('Error deleting habit:', err);
      throw err;
    }
  },

  // --------------------------------------------------
  // GOALS
  // --------------------------------------------------
  loadGoals: async (userId) => {
    set({ isLoadingGoals: true, error: null });
    try {
      const q = query(collection(db, 'goals'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const list: GoalModel[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as GoalModel);
      });
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      set({ goals: list, isLoadingGoals: false });
    } catch (err: any) {
      console.error('Error loading goals:', err);
      set({ error: err.message, isLoadingGoals: false });
    }
  },

  upsertGoal: async (userId, goal) => {
    try {
      const docRef = doc(db, 'goals', goal.id);
      await setDoc(docRef, { ...goal, userId });

      const current = get().goals;
      const index = current.findIndex((g) => g.id === goal.id);
      const updated = [...current];
      if (index >= 0) {
        updated[index] = goal;
      } else {
        updated.push(goal);
      }
      set({ goals: updated });
    } catch (err: any) {
      console.error('Error saving goal:', err);
      throw err;
    }
  },

  toggleGoal: async (goalId) => {
    try {
      const current = get().goals;
      const goal = current.find((g) => g.id === goalId);
      if (!goal) return;

      const newStatus = !goal.isCompleted;
      const docRef = doc(db, 'goals', goalId);
      await updateDoc(docRef, { isCompleted: newStatus });

      set({
        goals: current.map((g) => (g.id === goalId ? { ...g, isCompleted: newStatus } : g)),
      });
    } catch (err: any) {
      console.error('Error toggling goal:', err);
      throw err;
    }
  },

  deleteGoal: async (goalId) => {
    try {
      const docRef = doc(db, 'goals', goalId);
      await deleteDoc(docRef);
      set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) }));
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      throw err;
    }
  },

  // --------------------------------------------------
  // NOTES
  // --------------------------------------------------
  loadNotes: async (userId) => {
    set({ isLoadingNotes: true, error: null });
    try {
      const q = query(collection(db, 'notes'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const list: NoteModel[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as NoteModel);
      });
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ notes: list, isLoadingNotes: false });
    } catch (err: any) {
      console.error('Error loading notes:', err);
      set({ error: err.message, isLoadingNotes: false });
    }
  },

  upsertNote: async (userId, note) => {
    try {
      const docRef = doc(db, 'notes', note.id);
      await setDoc(docRef, { ...note, userId });

      const current = get().notes;
      const index = current.findIndex((n) => n.id === note.id);
      const updated = [...current];
      if (index >= 0) {
        updated[index] = note;
      } else {
        updated.push(note);
      }
      updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ notes: updated });
    } catch (err: any) {
      console.error('Error saving note:', err);
      throw err;
    }
  },

  deleteNote: async (noteId) => {
    try {
      const docRef = doc(db, 'notes', noteId);
      await deleteDoc(docRef);
      set((state) => ({ notes: state.notes.filter((n) => n.id !== noteId) }));
    } catch (err: any) {
      console.error('Error deleting note:', err);
      throw err;
    }
  },

  // --------------------------------------------------
  // CALENDAR EVENTS
  // --------------------------------------------------
  loadEvents: async (userId) => {
    set({ isLoadingEvents: true, error: null });
    try {
      const q = query(collection(db, 'calendar_events'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const list: CalendarEvent[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CalendarEvent);
      });
      set({ calendarEvents: list, isLoadingEvents: false });
    } catch (err: any) {
      console.error('Error loading calendar events:', err);
      set({ error: err.message, isLoadingEvents: false });
    }
  },

  upsertEvent: async (userId, event) => {
    try {
      const docRef = doc(db, 'calendar_events', event.id);
      await setDoc(docRef, { ...event, userId });

      const current = get().calendarEvents;
      const index = current.findIndex((e) => e.id === event.id);
      const updated = [...current];
      if (index >= 0) {
        updated[index] = event;
      } else {
        updated.push(event);
      }
      set({ calendarEvents: updated });
    } catch (err: any) {
      console.error('Error saving calendar event:', err);
      throw err;
    }
  },

  deleteEvent: async (eventId) => {
    try {
      const docRef = doc(db, 'calendar_events', eventId);
      await deleteDoc(docRef);
      set((state) => ({ calendarEvents: state.calendarEvents.filter((e) => e.id !== eventId) }));
    } catch (err: any) {
      console.error('Error deleting event:', err);
      throw err;
    }
  },

  clear: () =>
    set({
      tasks: [],
      habits: [],
      habitLogs: [],
      goals: [],
      notes: [],
      calendarEvents: [],
      isLoadingTasks: false,
      isLoadingHabits: false,
      isLoadingGoals: false,
      isLoadingNotes: false,
      isLoadingEvents: false,
      error: null,
    }),
}));
