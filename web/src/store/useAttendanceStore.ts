import { create } from 'zustand';
import { collection, query, where, getDocs, doc, setDoc, writeBatch, runTransaction } from 'firebase/firestore';
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
      // 1. Fetch subjects from 'attendance' collection
      const qSub = query(collection(db, 'attendance'), where('userId', '==', userId));
      const subSnapshot = await getDocs(qSub);
      const subjectsList: AttendanceSubject[] = [];
      subSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        subjectsList.push({
          id: data.id,
          name: data.name,
          color: data.color,
          targetPercentage: data.targetPercentage ?? 75,
          conducted: data.conducted ?? 0,
          present: data.present ?? 0,
          absent: data.absent ?? 0,
          percentage: data.percentage ?? 100,
          attendedCount: data.present ?? 0, // compatibility
          totalCount: data.conducted ?? 0, // compatibility
        } as AttendanceSubject);
      });

      // 2. Fetch records from 'attendance_logs' collection
      const qRec = query(collection(db, 'attendance_logs'), where('userId', '==', userId));
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

      // 1. If reset logs, delete attendance logs
      if (!keepHistory) {
        const qRec = query(collection(db, 'attendance_logs'), where('userId', '==', userId));
        const recSnapshot = await getDocs(qRec);
        recSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        
        // Also reset counts on existing subjects in memory and DB
        const currentSubjects = get().subjects;
        currentSubjects.forEach((sub) => {
          const docRef = doc(db, 'attendance', sub.id);
          batch.update(docRef, {
            conducted: 0,
            present: 0,
            absent: 0,
            percentage: 100,
          });
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
          // If keeping history and subject counts were reset, update them locally
          const updatedSub = {
            ...sub,
            ...(keepHistory ? {} : { conducted: 0, present: 0, absent: 0, percentage: 100, attendedCount: 0, totalCount: 0 }),
          };
          finalSubjects.push(updatedSub);
          uniqueNames.delete(sub.name); // Already handled
        } else {
          // Remove from database
          const docRef = doc(db, 'attendance', sub.id);
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
          conducted: 0,
          present: 0,
          absent: 0,
          percentage: 100,
          attendedCount: 0,
          totalCount: 0,
          userId,
        };
        const docRef = doc(db, 'attendance', newSubId);
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
      const logDoc = {
        id: recordId,
        subjectId: subject.id,
        subjectName,
        date,
        status: isPresent ? 'present' : 'absent',
        type,
        userId,
      };

      const logRef = doc(db, 'attendance_logs', recordId);
      const subjectRef = doc(db, 'attendance', subject.id);

      // Perform transaction
      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subjectRef);
        if (!subDoc.exists()) {
          throw new Error('Subject document does not exist!');
        }

        const data = subDoc.data() as AttendanceSubject;
        const newConducted = (data.conducted || 0) + 1;
        const newPresent = (data.present || 0) + (isPresent ? 1 : 0);
        const newAbsent = (data.absent || 0) + (isPresent ? 0 : 1);
        const newPercentage = newConducted > 0 ? (newPresent / newConducted) * 100 : 0;

        transaction.set(logRef, logDoc);
        transaction.update(subjectRef, {
          conducted: newConducted,
          present: newPresent,
          absent: newAbsent,
          percentage: newPercentage,
        });
      });

      const updatedRecord = { ...logDoc, status: isPresent ? 'present' as const : 'absent' as const };

      set((state) => {
        const newRecords = [...state.records, updatedRecord];
        const newSubjects = state.subjects.map((sub) => {
          if (sub.id === subject.id) {
            const newConducted = sub.conducted + 1;
            const newPresent = sub.present + (isPresent ? 1 : 0);
            const newAbsent = sub.absent + (isPresent ? 0 : 1);
            const newPercentage = newConducted > 0 ? (newPresent / newConducted) * 100 : 0;
            return {
              ...sub,
              conducted: newConducted,
              present: newPresent,
              absent: newAbsent,
              percentage: newPercentage,
              attendedCount: newPresent,
              totalCount: newConducted,
            };
          }
          return sub;
        });
        return { records: newRecords, subjects: newSubjects };
      });
    } catch (err: any) {
      console.error('Error logging attendance transactional:', err);
      throw err;
    }
  },

  toggleRecordStatus: async (recordId) => {
    try {
      const record = get().records.find((r) => r.id === recordId);
      if (!record) return;

      const oldStatus = record.status;
      const newStatus = oldStatus === 'present' ? 'absent' : 'present';
      const isPresentNow = newStatus === 'present';

      const logRef = doc(db, 'attendance_logs', recordId);
      const subjectRef = doc(db, 'attendance', record.subjectId);

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subjectRef);
        if (!subDoc.exists()) {
          throw new Error('Subject document not found.');
        }
        const data = subDoc.data() as AttendanceSubject;
        const conducted = data.conducted || 0;
        let newPresent = data.present || 0;
        let newAbsent = data.absent || 0;

        if (isPresentNow) {
          newPresent += 1;
          newAbsent = Math.max(0, newAbsent - 1);
        } else {
          newPresent = Math.max(0, newPresent - 1);
          newAbsent += 1;
        }
        const newPercentage = conducted > 0 ? (newPresent / conducted) * 100 : 0;

        transaction.update(logRef, { status: newStatus });
        transaction.update(subjectRef, {
          present: newPresent,
          absent: newAbsent,
          percentage: newPercentage,
        });
      });

      set((state) => {
        const newRecords = state.records.map((r) =>
          r.id === recordId ? { ...r, status: newStatus as 'present' | 'absent' } : r
        );
        const newSubjects = state.subjects.map((sub) => {
          if (sub.id === record.subjectId) {
            let newPresent = sub.present;
            let newAbsent = sub.absent;
            if (isPresentNow) {
              newPresent += 1;
              newAbsent = Math.max(0, newAbsent - 1);
            } else {
              newPresent = Math.max(0, newPresent - 1);
              newAbsent += 1;
            }
            const newPercentage = sub.conducted > 0 ? (newPresent / sub.conducted) * 100 : 0;
            return {
              ...sub,
              present: newPresent,
              absent: newAbsent,
              percentage: newPercentage,
              attendedCount: newPresent,
              totalCount: sub.conducted,
            };
          }
          return sub;
        });
        return { records: newRecords, subjects: newSubjects };
      });
    } catch (err: any) {
      console.error('Error toggling record status transactional:', err);
      throw err;
    }
  },

  deleteRecord: async (recordId) => {
    try {
      const record = get().records.find((r) => r.id === recordId);
      if (!record) return;

      const isPresent = record.status === 'present';
      const logRef = doc(db, 'attendance_logs', recordId);
      const subjectRef = doc(db, 'attendance', record.subjectId);

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subjectRef);
        if (!subDoc.exists()) {
          throw new Error('Subject document not found.');
        }
        const data = subDoc.data() as AttendanceSubject;
        const newConducted = Math.max(0, (data.conducted || 0) - 1);
        const newPresent = isPresent ? Math.max(0, (data.present || 0) - 1) : (data.present || 0);
        const newAbsent = !isPresent ? Math.max(0, (data.absent || 0) - 1) : (data.absent || 0);
        const newPercentage = newConducted > 0 ? (newPresent / newConducted) * 100 : 100;

        transaction.delete(logRef);
        transaction.update(subjectRef, {
          conducted: newConducted,
          present: newPresent,
          absent: newAbsent,
          percentage: newPercentage,
        });
      });

      set((state) => {
        const newRecords = state.records.filter((r) => r.id !== recordId);
        const newSubjects = state.subjects.map((sub) => {
          if (sub.id === record.subjectId) {
            const newConducted = Math.max(0, sub.conducted - 1);
            const newPresent = isPresent ? Math.max(0, sub.present - 1) : sub.present;
            const newAbsent = !isPresent ? Math.max(0, sub.absent - 1) : sub.absent;
            const newPercentage = newConducted > 0 ? (newPresent / newConducted) * 100 : 100;
            return {
              ...sub,
              conducted: newConducted,
              present: newPresent,
              absent: newAbsent,
              percentage: newPercentage,
              attendedCount: newPresent,
              totalCount: newConducted,
            };
          }
          return sub;
        });
        return { records: newRecords, subjects: newSubjects };
      });
    } catch (err: any) {
      console.error('Error deleting record transactional:', err);
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
        conducted: 0,
        present: 0,
        absent: 0,
        percentage: 100,
        attendedCount: 0,
        totalCount: 0,
        userId,
      };

      const docRef = doc(db, 'attendance', subId);
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
      
      const subRef = doc(db, 'attendance', subjectId);
      batch.delete(subRef);

      const matchingRecords = get().records.filter((r) => r.subjectId === subjectId);
      matchingRecords.forEach((r) => {
        const recRef = doc(db, 'attendance_logs', r.id);
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
    return get().subjects;
  },

  getOverallStats: () => {
    const { subjects } = get();
    let totalConducted = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    subjects.forEach((s) => {
      totalConducted += s.conducted;
      totalPresent += s.present;
      totalAbsent += s.absent;
    });

    if (totalConducted === 0) {
      return { percentage: 100, attended: 0, absent: 0, total: 0, theory: 0, labs: 0 };
    }

    const { records } = get();
    const theory = records.filter((r) => r.type === 'Lecture').length;
    const labs = records.filter((r) => r.type === 'Lab').length;
    const percentage = (totalPresent / totalConducted) * 100;

    return {
      percentage,
      attended: totalPresent,
      absent: totalAbsent,
      total: totalConducted,
      theory,
      labs,
    };
  },

  clear: () => set({ subjects: [], records: [], isLoading: false, error: null }),
}));
