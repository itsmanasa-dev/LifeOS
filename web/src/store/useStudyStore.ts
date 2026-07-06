import { create } from 'zustand';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { 
  StudySession, SyllabusNote, CompletedSyllabusItem, StudyStatistics 
} from '../types';

interface ActiveSession {
  startTime: number | null; // timestamp when segment started (or null if paused)
  accumulatedSeconds: number; // seconds focused before this segment
  isRunning: boolean;
  notes: string;
}

interface StudyStoreState {
  // Settings & Formats
  dailyGoal: number; // in seconds (default 4 hours = 14400)
  timeDisplayFormat: '12h' | '24h';
  
  // Timer State
  activeSession: ActiveSession | null;
  secondsActive: number; // live seconds focused in the current session
  
  // Stats
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  totalStudyTime: number; // in seconds
  maxSessionDuration: number; // in seconds
  dailyTotals: { [date: string]: number }; // YYYY-MM-DD -> seconds
  
  // Lists
  syllabusNotes: SyllabusNote[];
  completedSyllabus: CompletedSyllabusItem[];
  
  // Statuses
  isLoading: boolean;
  isOnline: boolean;
  isSyncingOffline: boolean;
  timerIntervalId: any | null;

  // Initializer
  loadStudyData: (userId: string) => Promise<void>;
  setDailyGoal: (userId: string, seconds: number) => Promise<void>;
  setTimeDisplayFormat: (format: '12h' | '24h') => void;
  
  // Timer Operations
  startTimer: (userId: string, notes?: string) => Promise<void>;
  updateTimerNotes: (userId: string, notes: string) => Promise<void>;
  pauseTimer: (userId: string) => Promise<void>;
  stopAndSaveTimer: (userId: string, sessionNotes: string) => Promise<void>;
  cancelTimer: (userId: string) => Promise<void>;
  
  // Syllabus Notes Operations
  addSyllabusNote: (userId: string, note: Omit<SyllabusNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSyllabusNote: (userId: string, noteId: string, updates: Partial<SyllabusNote>) => Promise<void>;
  deleteSyllabusNote: (userId: string, noteId: string) => Promise<void>;
  completeSyllabusNote: (userId: string, noteId: string, timeTakenMinutes: number) => Promise<void>;
  
  // Completed Syllabus Operations
  deleteCompletedSyllabusItem: (userId: string, itemId: string) => Promise<void>;
  
  // Offline State Synchronizer
  setOnlineStatus: (status: boolean) => void;
  syncOfflineQueue: (userId: string) => Promise<void>;

  // BACKWARD COMPATIBILITY
  streak: number;
  targetDurationMinutes: number;
  secondsRemaining: number;
  isRunning: boolean;
  syllabus: any[];
}

// Helpers
function getTodayDateString(): string {
  // Returns YYYY-MM-DD in local time
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateStreaks(dailyTotals: { [date: string]: number }, dailyGoal: number) {
  // Filter days where the daily study time is >= dailyGoal
  const qualifyingDates = Object.entries(dailyTotals)
    .filter(([_, duration]) => duration >= dailyGoal)
    .map(([dateStr, _]) => dateStr)
    .sort();

  if (qualifyingDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  // Total study days represents days the user studied at all (> 0 seconds)
  const totalStudyDays = Object.values(dailyTotals).filter(d => d > 0).length;

  for (let i = 0; i < qualifyingDates.length; i++) {
    const currentDate = new Date(qualifyingDates[i]);
    if (lastDate === null) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    lastDate = currentDate;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Check if current streak is active (studied today or studied yesterday)
  const todayStr = getTodayDateString();
  
  // Yesterday calculation
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYear = yesterday.getFullYear();
  const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;

  const hasStudiedToday = qualifyingDates.includes(todayStr);
  const hasStudiedYesterday = qualifyingDates.includes(yesterdayStr);

  let currentStreak = 0;
  if (hasStudiedToday || hasStudiedYesterday) {
    let activeStreak = 0;
    const revQualifying = [...qualifyingDates].reverse();
    let checkDateStr = hasStudiedToday ? todayStr : yesterdayStr;
    let expectedTime = new Date(checkDateStr).getTime();

    for (const qDateStr of revQualifying) {
      const qTime = new Date(qDateStr).getTime();
      const diffDays = Math.round(Math.abs(expectedTime - qTime) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        activeStreak++;
        expectedTime -= 86400000;
      } else if (diffDays === 1) {
        activeStreak++;
        expectedTime = qTime - 86400000;
      } else {
        break;
      }
    }
    currentStreak = activeStreak;
  }

  return { currentStreak, longestStreak, totalStudyDays };
}

export const useStudyStore = create<StudyStoreState>((set, get) => {
  
  // Start ticks internally for the UI
  const startTicks = () => {
    if (get().timerIntervalId) return;
    
    const interval = setInterval(() => {
      const active = get().activeSession;
      if (active && active.isRunning && active.startTime) {
        const elapsedSegment = Math.floor((Date.now() - active.startTime) / 1000);
        const total = active.accumulatedSeconds + elapsedSegment;
        
        // Update live tick states
        set({ 
          secondsActive: total,
          // Sync backward compatible variable for countdown (progress ring)
          secondsRemaining: Math.max(0, get().dailyGoal - (get().dailyTotals[getTodayDateString()] || 0) - total),
        });
      }
    }, 1000);
    
    set({ timerIntervalId: interval });
  };

  const stopTicks = () => {
    const interval = get().timerIntervalId;
    if (interval) {
      clearInterval(interval);
      set({ timerIntervalId: null });
    }
  };

  return {
    // State Initial Settings
    dailyGoal: 14400, // 4 hours
    timeDisplayFormat: '12h',
    activeSession: null,
    secondsActive: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalStudyDays: 0,
    totalStudyTime: 0,
    maxSessionDuration: 0,
    dailyTotals: {},
    syllabusNotes: [],
    completedSyllabus: [],
    isLoading: false,
    isOnline: navigator.onLine,
    isSyncingOffline: false,
    timerIntervalId: null,

    // Backward compatibility mappings
    streak: 0,
    targetDurationMinutes: 240,
    secondsRemaining: 14400,
    isRunning: false,
    syllabus: [],

    setOnlineStatus: (status) => {
      set({ isOnline: status });
      if (status) {
        // Trigger offline synchronization queue
        // Check if user is logged in
        const storageVal = localStorage.getItem('lifeos_study_active_session_uid');
        if (storageVal) {
          get().syncOfflineQueue(storageVal);
        }
      }
    },

    loadStudyData: async (userId) => {
      if (!userId) return;
      set({ isLoading: true });
      try {
        // 1. Load Statistics
        const statsDocRef = doc(db, 'study_statistics', userId);
        const statsSnap = await getDoc(statsDocRef);
        
        let statsData: Partial<StudyStatistics> = {};
        
        if (statsSnap.exists()) {
          statsData = statsSnap.data() as Partial<StudyStatistics>;
        } else {
          // Initialize study stats
          const initialStats: StudyStatistics = {
            userId,
            dailyGoal: 14400, // 4 hours
            currentStreak: 0,
            longestStreak: 0,
            totalStudyDays: 0,
            totalStudyTime: 0,
            maxSessionDuration: 0,
            dailyTotals: {},
            lastUpdated: new Date().toISOString()
          };
          await setDoc(statsDocRef, initialStats);
          statsData = initialStats;
        }

        const dailyTotals = statsData.dailyTotals || {};
        const dailyGoal = statsData.dailyGoal || 14400;

        // Recompute streaks to ensure accuracy based on today's date
        const streakData = calculateStreaks(dailyTotals, dailyGoal);

        // 2. Load Syllabus Notes
        const notesQuery = query(
          collection(db, 'syllabus_notes'), 
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const notesSnap = await getDocs(notesQuery);
        const syllabusNotes: SyllabusNote[] = [];
        notesSnap.forEach((docSnap) => {
          syllabusNotes.push(docSnap.data() as SyllabusNote);
        });

        // 3. Load Completed Syllabus
        const completedQuery = query(
          collection(db, 'completed_syllabus'),
          where('userId', '==', userId),
          orderBy('completedAt', 'desc')
        );
        const completedSnap = await getDocs(completedQuery);
        const completedSyllabus: CompletedSyllabusItem[] = [];
        completedSnap.forEach((docSnap) => {
          completedSyllabus.push(docSnap.data() as CompletedSyllabusItem);
        });

        // 4. Restore Active Session
        // Check local storage first
        let activeSession: ActiveSession | null = null;
        const localActive = localStorage.getItem(`lifeos_study_active_session_${userId}`);
        
        if (localActive) {
          try {
            activeSession = JSON.parse(localActive);
          } catch (e) {
            console.error('Error parsing local active session:', e);
          }
        }
        
        // If not found in local storage, check Firestore stats doc
        if (!activeSession && statsData.activeSession) {
          const fsActive = statsData.activeSession;
          activeSession = {
            startTime: fsActive.startTime ? new Date(fsActive.startTime).getTime() : null,
            accumulatedSeconds: fsActive.accumulatedSeconds || 0,
            isRunning: fsActive.isRunning || false,
            notes: fsActive.notes || ''
          };
          // Sync to localStorage
          localStorage.setItem(`lifeos_study_active_session_${userId}`, JSON.stringify(activeSession));
        }

        // Setup timer ticking if the restored session was active
        let liveSecondsActive = 0;
        if (activeSession) {
          localStorage.setItem('lifeos_study_active_session_uid', userId);
          if (activeSession.isRunning && activeSession.startTime) {
            const elapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
            liveSecondsActive = activeSession.accumulatedSeconds + elapsed;
            
            // Start the interval ticking
            setTimeout(() => startTicks(), 50);
          } else {
            liveSecondsActive = activeSession.accumulatedSeconds;
          }
        }

        const todayStudied = dailyTotals[getTodayDateString()] || 0;
        const totalTodayTime = todayStudied + liveSecondsActive;

        // Set state
        set({
          dailyGoal,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          totalStudyDays: streakData.totalStudyDays,
          totalStudyTime: statsData.totalStudyTime || 0,
          maxSessionDuration: statsData.maxSessionDuration || 0,
          dailyTotals,
          syllabusNotes,
          completedSyllabus,
          activeSession,
          secondsActive: liveSecondsActive,
          isLoading: false,
          
          // Backward compatibility mappings
          streak: streakData.currentStreak,
          targetDurationMinutes: Math.round(dailyGoal / 60),
          secondsRemaining: Math.max(0, dailyGoal - totalTodayTime),
          isRunning: activeSession?.isRunning ?? false,
          syllabus: syllabusNotes.map(n => ({
            name: n.title,
            progress: n.status === 'Completed' ? 1.0 : n.status === 'In Progress' ? 0.5 : 0.0,
            colorHex: n.priority === 'urgent' ? '#EF4444' : n.priority === 'high' ? '#F59E0B' : '#6366F1'
          }))
        });

      } catch (err) {
        console.error('Error loading study data:', err);
        set({ isLoading: false });
      }
    },

    setDailyGoal: async (userId, seconds) => {
      if (!userId) return;
      try {
        set({ dailyGoal: seconds, targetDurationMinutes: Math.round(seconds / 60) });
        
        // Recalculate streak based on new goal
        const streakData = calculateStreaks(get().dailyTotals, seconds);
        set({
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          totalStudyDays: streakData.totalStudyDays,
          streak: streakData.currentStreak
        });

        // Sync to Firestore in background
        const statsRef = doc(db, 'study_statistics', userId);
        setDoc(statsRef, { 
          dailyGoal: seconds,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          totalStudyDays: streakData.totalStudyDays,
          lastUpdated: new Date().toISOString()
        }, { merge: true }).catch(err => console.error('Error syncing goal to Firestore:', err));

      } catch (err) {
        console.error('Error setting daily goal:', err);
      }
    },

    setTimeDisplayFormat: (format) => {
      set({ timeDisplayFormat: format });
    },

    startTimer: async (userId, initialNotes = '') => {
      if (!userId) return;
      
      const currentActive = get().activeSession;
      let newSession: ActiveSession;

      if (currentActive) {
        // Resume paused session
        newSession = {
          ...currentActive,
          startTime: Date.now(),
          isRunning: true,
          notes: initialNotes || currentActive.notes
        };
      } else {
        // Start brand new session
        newSession = {
          startTime: Date.now(),
          accumulatedSeconds: 0,
          isRunning: true,
          notes: initialNotes
        };
      }

      set({ 
        activeSession: newSession, 
        isRunning: true,
        secondsActive: newSession.accumulatedSeconds
      });

      // Persist locally
      localStorage.setItem(`lifeos_study_active_session_${userId}`, JSON.stringify(newSession));
      localStorage.setItem('lifeos_study_active_session_uid', userId);

      // Persist in Firestore stats (background call)
      const statsRef = doc(db, 'study_statistics', userId);
      updateDoc(statsRef, {
        activeSession: {
          startTime: new Date(newSession.startTime!).toISOString(),
          accumulatedSeconds: newSession.accumulatedSeconds,
          isRunning: true,
          notes: newSession.notes,
          lastUpdated: new Date().toISOString()
        }
      }).catch(e => console.error('Failed to sync timer start to Firestore:', e));

      // Start ticker
      startTicks();
    },

    updateTimerNotes: async (userId, notes) => {
      const active = get().activeSession;
      if (!active || !userId) return;

      const updated = { ...active, notes };
      set({ activeSession: updated });

      localStorage.setItem(`lifeos_study_active_session_${userId}`, JSON.stringify(updated));

      const statsRef = doc(db, 'study_statistics', userId);
      updateDoc(statsRef, {
        'activeSession.notes': notes,
        'activeSession.lastUpdated': new Date().toISOString()
      }).catch(e => console.error('Failed to update session notes in Firestore:', e));
    },

    pauseTimer: async (userId) => {
      const active = get().activeSession;
      if (!active || !active.isRunning || !userId) return;

      stopTicks();

      const elapsedSegment = active.startTime ? Math.floor((Date.now() - active.startTime) / 1000) : 0;
      const totalAccumulated = active.accumulatedSeconds + elapsedSegment;

      const pausedSession: ActiveSession = {
        startTime: null,
        accumulatedSeconds: totalAccumulated,
        isRunning: false,
        notes: active.notes
      };

      set({ 
        activeSession: pausedSession, 
        isRunning: false,
        secondsActive: totalAccumulated
      });

      localStorage.setItem(`lifeos_study_active_session_${userId}`, JSON.stringify(pausedSession));

      const statsRef = doc(db, 'study_statistics', userId);
      updateDoc(statsRef, {
        activeSession: {
          startTime: null,
          accumulatedSeconds: totalAccumulated,
          isRunning: false,
          notes: active.notes,
          lastUpdated: new Date().toISOString()
        }
      }).catch(e => console.error('Failed to sync pause state:', e));
    },

    stopAndSaveTimer: async (userId, sessionNotes) => {
      const active = get().activeSession;
      if (!active || !userId) return;

      stopTicks();

      // Determine final duration
      let elapsedSegment = 0;
      let sessionStartTime = active.startTime;

      if (active.isRunning && active.startTime) {
        elapsedSegment = Math.floor((Date.now() - active.startTime) / 1000);
      }
      
      const finalDuration = active.accumulatedSeconds + elapsedSegment;
      
      // If duration is less than 10 seconds, don't save (prevent accidental logs)
      if (finalDuration < 10) {
        get().cancelTimer(userId);
        return;
      }

      const endTimestamp = Date.now();
      const startTimestamp = sessionStartTime 
        ? sessionStartTime - (active.accumulatedSeconds * 1000)
        : endTimestamp - (finalDuration * 1000);

      const todayStr = getTodayDateString();

      // Create new session object
      const sessionId = doc(collection(db, 'study_sessions')).id;
      const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser';
      
      const newSession: StudySession = {
        id: sessionId,
        userId,
        startTime: Timestamp.fromMillis(startTimestamp),
        endTime: Timestamp.fromMillis(endTimestamp),
        duration: finalDuration,
        date: todayStr,
        notes: sessionNotes || active.notes || 'Continuous Study Session',
        device: deviceName
      };

      // 1. Save to study_sessions in Firestore in background
      const sessionDocRef = doc(db, 'study_sessions', sessionId);
      let isQueuedLocally = false;

      setDoc(sessionDocRef, newSession).catch(e => {
        console.warn('Firebase write failed. Caching offline session locally for recovery check.', e);
        const offlineQueue = JSON.parse(localStorage.getItem(`lifeos_offline_sessions_${userId}`) || '[]');
        offlineQueue.push({
          ...newSession,
          startTime: { seconds: Math.floor(startTimestamp / 1000), nanoseconds: 0 },
          endTime: { seconds: Math.floor(endTimestamp / 1000), nanoseconds: 0 }
        });
        localStorage.setItem(`lifeos_offline_sessions_${userId}`, JSON.stringify(offlineQueue));
        isQueuedLocally = true;
      });

      // 2. Update local state statistics
      const updatedDailyTotals = { ...get().dailyTotals };
      updatedDailyTotals[todayStr] = (updatedDailyTotals[todayStr] || 0) + finalDuration;

      const streakData = calculateStreaks(updatedDailyTotals, get().dailyGoal);
      const newTotalTime = get().totalStudyTime + finalDuration;
      const newMaxSession = Math.max(get().maxSessionDuration || 0, finalDuration);

      set({
        activeSession: null,
        isRunning: false,
        secondsActive: 0,
        dailyTotals: updatedDailyTotals,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalStudyDays: streakData.totalStudyDays,
        totalStudyTime: newTotalTime,
        maxSessionDuration: newMaxSession,
        
        // Backward compatibility
        streak: streakData.currentStreak,
        secondsRemaining: Math.max(0, get().dailyGoal - (updatedDailyTotals[todayStr] || 0))
      });

      // Clear local active session storage
      localStorage.removeItem(`lifeos_study_active_session_${userId}`);
      localStorage.removeItem('lifeos_study_active_session_uid');

      // 3. Update statistics document in Firestore in background
      const statsRef = doc(db, 'study_statistics', userId);
      updateDoc(statsRef, {
        dailyTotals: updatedDailyTotals,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalStudyDays: streakData.totalStudyDays,
        totalStudyTime: newTotalTime,
        maxSessionDuration: newMaxSession,
        activeSession: null,
        lastUpdated: new Date().toISOString()
      }).catch(e => console.error('Failed to update stats in Firestore (cached natively):', e));

      // Sync offline queue if we are online now
      if (get().isOnline && isQueuedLocally) {
        get().syncOfflineQueue(userId);
      }
    },

    cancelTimer: async (userId) => {
      if (!userId) return;
      stopTicks();

      set({
        activeSession: null,
        isRunning: false,
        secondsActive: 0,
        secondsRemaining: Math.max(0, get().dailyGoal - (get().dailyTotals[getTodayDateString()] || 0))
      });

      localStorage.removeItem(`lifeos_study_active_session_${userId}`);
      localStorage.removeItem('lifeos_study_active_session_uid');

      const statsRef = doc(db, 'study_statistics', userId);
      updateDoc(statsRef, {
        activeSession: null
      }).catch(e => console.error('Failed to clear active session in Firestore:', e));
    },

    // ----------------------------------------------------
    // SYLLABUS NOTES CRUD
    // ----------------------------------------------------
    addSyllabusNote: async (userId, note) => {
      if (!userId) return;
      try {
        const noteId = doc(collection(db, 'syllabus_notes')).id;
        const newNote: SyllabusNote = {
          ...note,
          id: noteId,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedNotes = [newNote, ...get().syllabusNotes];
        set({ 
          syllabusNotes: updatedNotes,
          syllabus: updatedNotes.map(n => ({
            name: n.title,
            progress: n.status === 'Completed' ? 1.0 : n.status === 'In Progress' ? 0.5 : 0.0,
            colorHex: n.priority === 'urgent' ? '#EF4444' : n.priority === 'high' ? '#F59E0B' : '#6366F1'
          }))
        });

        setDoc(doc(db, 'syllabus_notes', noteId), newNote).catch(err => console.error('Error adding syllabus note to firestore:', err));
      } catch (err) {
        console.error('Error adding syllabus note:', err);
      }
    },

    updateSyllabusNote: async (userId, noteId, updates) => {
      if (!userId || !noteId) return;
      try {
        const updatedNotes = get().syllabusNotes.map((note) => {
          if (note.id === noteId) {
            return { ...note, ...updates, updatedAt: new Date().toISOString() };
          }
          return note;
        });

        set({ 
          syllabusNotes: updatedNotes,
          syllabus: updatedNotes.map(n => ({
            name: n.title,
            progress: n.status === 'Completed' ? 1.0 : n.status === 'In Progress' ? 0.5 : 0.0,
            colorHex: n.priority === 'urgent' ? '#EF4444' : n.priority === 'high' ? '#F59E0B' : '#6366F1'
          }))
        });

        updateDoc(doc(db, 'syllabus_notes', noteId), {
          ...updates,
          updatedAt: new Date().toISOString()
        }).catch(err => console.error('Error updating syllabus note in firestore:', err));
      } catch (err) {
        console.error('Error updating syllabus note:', err);
      }
    },

    deleteSyllabusNote: async (userId, noteId) => {
      if (!userId || !noteId) return;
      try {
        const updatedNotes = get().syllabusNotes.filter((note) => note.id !== noteId);
        set({ 
          syllabusNotes: updatedNotes,
          syllabus: updatedNotes.map(n => ({
            name: n.title,
            progress: n.status === 'Completed' ? 1.0 : n.status === 'In Progress' ? 0.5 : 0.0,
            colorHex: n.priority === 'urgent' ? '#EF4444' : n.priority === 'high' ? '#F59E0B' : '#6366F1'
          }))
        });

        deleteDoc(doc(db, 'syllabus_notes', noteId)).catch(err => console.error('Error deleting syllabus note in firestore:', err));
      } catch (err) {
        console.error('Error deleting syllabus note:', err);
      }
    },

    completeSyllabusNote: async (userId, noteId, timeTakenMinutes) => {
      if (!userId || !noteId) return;
      try {
        const targetNote = get().syllabusNotes.find(n => n.id === noteId);
        if (!targetNote) return;

        const completedItem: CompletedSyllabusItem = {
          ...targetNote,
          status: 'Completed',
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          timeTaken: timeTakenMinutes
        };

        const updatedSyllabusNotes = get().syllabusNotes.filter(n => n.id !== noteId);
        const updatedCompletedSyllabus = [completedItem, ...get().completedSyllabus];

        set({
          syllabusNotes: updatedSyllabusNotes,
          completedSyllabus: updatedCompletedSyllabus,
          syllabus: updatedSyllabusNotes.map(n => ({
            name: n.title,
            progress: 0.5,
            colorHex: '#6366F1'
          }))
        });

        deleteDoc(doc(db, 'syllabus_notes', noteId)).catch(err => console.error('Error deleting notes from active:', err));
        setDoc(doc(db, 'completed_syllabus', noteId), completedItem).catch(err => console.error('Error adding notes to completed:', err));

      } catch (err) {
        console.error('Error completing syllabus note:', err);
      }
    },

    deleteCompletedSyllabusItem: async (userId, itemId) => {
      if (!userId || !itemId) return;
      try {
        const updatedCompleted = get().completedSyllabus.filter(n => n.id !== itemId);
        set({ completedSyllabus: updatedCompleted });
        deleteDoc(doc(db, 'completed_syllabus', itemId)).catch(err => console.error('Error deleting completed syllabus item from firestore:', err));
      } catch (err) {
        console.error('Error deleting completed syllabus item:', err);
      }
    },

    syncOfflineQueue: async (userId) => {
      if (!userId) return;
      const offlineQueueKey = `lifeos_offline_sessions_${userId}`;
      const cached = localStorage.getItem(offlineQueueKey);
      if (!cached) return;

      const sessionsToSync = JSON.parse(cached);
      if (sessionsToSync.length === 0) return;

      set({ isSyncingOffline: true });
      let failedToSync = [];

      for (const session of sessionsToSync) {
        try {
          const docRef = doc(db, 'study_sessions', session.id);
          const startTs = new Timestamp(session.startTime.seconds, 0);
          const endTs = new Timestamp(session.endTime.seconds, 0);

          await setDoc(docRef, {
            ...session,
            startTime: startTs,
            endTime: endTs
          });
        } catch (e) {
          console.error('Failed to sync offline study session:', e);
          failedToSync.push(session);
        }
      }

      if (failedToSync.length > 0) {
        localStorage.setItem(offlineQueueKey, JSON.stringify(failedToSync));
      } else {
        localStorage.removeItem(offlineQueueKey);
      }

      set({ isSyncingOffline: false });
    }
  };
});
