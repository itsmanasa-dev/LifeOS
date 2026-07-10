export * from './user';

export interface TimetableEntry {
  id: string;
  subjectName: string;
  subjectColor: string;
  startTime: string;
  endTime: string;
  room?: string;
  dayOfWeek: number; // 1 = Monday, 7 = Sunday
  type: 'Lecture' | 'Lab';
  lowConfidenceFields?: string[];
}

export interface AttendanceSubject {
  id: string;
  name: string;
  color: string;
  targetPercentage: number;
  attendedCount: number;
  totalCount: number;
  conducted: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // ISO String
  status: 'present' | 'absent' | 'cancelled';
  type: 'Lecture' | 'Lab';
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'Pending' | 'Completed' | 'Overdue';

export interface TaskModel {
  id: string;
  title: string;
  subject?: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  priority: TaskPriority;
  status: TaskStatus;
  reminder: 'none' | '10m' | '30m' | '1h' | '1d';
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface HabitModel {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface HabitLog {
  habitId: string;
  date: string; // ISO Date (YYYY-MM-DD)
  isCompleted: boolean;
}

export interface SyllabusItem {
  name: string;
  progress: number; // 0.0 to 1.0
  colorHex: string;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: any; // Firebase Timestamp
  endTime: any; // Firebase Timestamp
  duration: number; // in seconds
  date: string; // YYYY-MM-DD
  notes: string;
  device: string;
}

export type SyllabusNotePriority = 'low' | 'medium' | 'high' | 'urgent';
export type SyllabusNoteStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface SyllabusNote {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description: string;
  priority: SyllabusNotePriority;
  status: SyllabusNoteStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  timeTaken?: number; // Time taken in minutes
}

export interface CompletedSyllabusItem extends SyllabusNote {
  completedAt: string; // ISO string
}

export interface StudyStatistics {
  userId: string;
  dailyGoal: number; // in seconds (default 4 hours = 14400)
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  totalStudyTime: number; // in seconds
  maxSessionDuration: number; // in seconds
  dailyTotals: { [date: string]: number }; // date YYYY-MM-DD -> seconds
  lastUpdated: string; // ISO string
  activeSession?: {
    startTime: string | null;
    accumulatedSeconds: number;
    isRunning: boolean;
    notes: string;
    lastUpdated: string;
  } | null;
}

export interface GoalModel {
  id: string;
  title: string;
  targetDate?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface NoteModel {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  category?: string;
  description?: string;
}
