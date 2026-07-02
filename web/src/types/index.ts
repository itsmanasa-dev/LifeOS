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
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // ISO String
  status: 'present' | 'absent' | 'cancelled';
  type: 'Lecture' | 'Lab';
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed';

export interface TaskModel {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  isCompleted: boolean;
  category?: string;
  dueDate?: string; // ISO String
  createdAt?: string; // ISO String
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
