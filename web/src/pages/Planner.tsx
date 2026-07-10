import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import { 
  Plus, Trash2, Edit3, CheckCircle2, Circle, AlertTriangle, CalendarDays, Search, ArrowUpDown, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { TaskModel, TaskPriority, TaskStatus } from '../types';

type PlannerTab = 'today' | 'tomorrow' | 'upcoming' | 'completed';

const Planner: React.FC = () => {
  const { user } = useAuthStore();
  const planner = usePlannerStore();
  const uid = user?.uid || '';

  const todayStr = new Date().toLocaleDateString('en-CA');
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  })();

  // Core Data loader
  useEffect(() => {
    if (uid) {
      planner.loadTasks(uid);
    }
  }, [uid]);

  // Request browser notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Notifications Reminder Poller
  useEffect(() => {
    const checkReminders = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      
      const now = new Date();
      const notifiedStr = localStorage.getItem('planner_notified_ids') || '[]';
      const notifiedIds: string[] = JSON.parse(notifiedStr);
      let updated = false;

      planner.tasks.forEach((t) => {
        if (t.status === 'Completed' || t.reminder === 'none' || notifiedIds.includes(t.id)) return;

        const dueDateTime = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`);
        let reminderTime = new Date(dueDateTime);

        if (t.reminder === '10m') reminderTime.setMinutes(dueDateTime.getMinutes() - 10);
        else if (t.reminder === '30m') reminderTime.setMinutes(dueDateTime.getMinutes() - 30);
        else if (t.reminder === '1h') reminderTime.setHours(dueDateTime.getHours() - 1);
        else if (t.reminder === '1d') reminderTime.setDate(dueDateTime.getDate() - 1);

        if (now >= reminderTime && now < dueDateTime) {
          new Notification(`Reminder: ${t.title}`, {
            body: `${t.subject ? `[${t.subject}] ` : ''}Due at ${t.dueTime} today.`,
            icon: '/favicon.svg',
          });
          notifiedIds.push(t.id);
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem('planner_notified_ids', JSON.stringify(notifiedIds));
      }
    };

    const interval = setInterval(checkReminders, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, [planner.tasks]);

  // Search & Sort states
  const [activeTab, setActiveTab] = useState<PlannerTab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'dueDate' | 'dueTime' | 'priority'>('dueDate');
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  // Month calendar state
  const [focusedMonth, setFocusedMonth] = useState<Date>(new Date());

  // Task creation/edit modal state
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: TaskModel }>({ open: false });

  // Handle Form Submit
  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const title = formData.get('title') as string;
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const dueDate = formData.get('dueDate') as string;
    const dueTime = formData.get('dueTime') as string;
    const priority = formData.get('priority') as TaskPriority;
    const status = formData.get('status') as TaskStatus;
    const reminder = formData.get('reminder') as 'none' | '10m' | '30m' | '1h' | '1d';

    if (!title || !dueDate || !dueTime) {
      toast.error('Please enter Title, Due Date and Due Time.');
      return;
    }

    const taskId = taskModal.task?.id || `task-${Date.now()}`;
    const nowISO = new Date().toISOString();

    const taskDoc: TaskModel = {
      id: taskId,
      title: title.trim(),
      subject: subject ? subject.trim() : undefined,
      description: description ? description.trim() : undefined,
      dueDate,
      dueTime,
      priority,
      status,
      reminder,
      createdAt: taskModal.task?.createdAt || nowISO,
      updatedAt: nowISO,
      completedAt: status === 'Completed' ? (taskModal.task?.completedAt || nowISO) : null,
    };

    try {
      await planner.upsertTask(uid, taskDoc);
      toast.success(taskModal.task ? 'Task updated!' : 'Task added!');
      setTaskModal({ open: false });
    } catch (err) {
      toast.error('Failed to save task.');
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      await planner.toggleComplete(uid, taskId);
      toast.success('Task status updated');
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Delete this task?')) {
      try {
        await planner.deleteTask(uid, taskId);
        toast.success('Task deleted');
      } catch (err) {
        toast.error('Failed to delete task.');
      }
    }
  };

  // Calendar calculations
  const year = focusedMonth.getFullYear();
  const month = focusedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  const firstWeekdayMapped = firstWeekday === 0 ? 6 : firstWeekday - 1; // Map Sun to 6, Mon to 0
  const monthLabel = focusedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getTaskCountForDay = (dateStr: string) => {
    return planner.tasks.filter((t) => t.dueDate === dateStr && t.status !== 'Completed').length;
  };

  // Filter Tasks according to Search, Tabs, Calendar
  const filteredTasks = planner.tasks.filter((t) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchSubject = t.subject ? t.subject.toLowerCase().includes(q) : false;
      const matchDate = t.dueDate.includes(q);
      if (!matchTitle && !matchSubject && !matchDate) return false;
    }

    // 2. Calendar Selection Override
    if (selectedDayStr) {
      return t.dueDate === selectedDayStr;
    }

    // 3. Tab Filter
    if (activeTab === 'today') {
      return t.dueDate === todayStr && t.status !== 'Completed';
    }
    if (activeTab === 'tomorrow') {
      return t.dueDate === tomorrowStr && t.status !== 'Completed';
    }
    if (activeTab === 'upcoming') {
      return t.dueDate > tomorrowStr && t.status !== 'Completed';
    }
    if (activeTab === 'completed') {
      return t.status === 'Completed';
    }
    return true;
  });

  // Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortField === 'dueDate') {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortField === 'dueTime') {
      return a.dueTime.localeCompare(b.dueTime);
    }
    if (sortField === 'priority') {
      const prioritiesMap = { urgent: 0, high: 1, medium: 2, low: 3 };
      return prioritiesMap[a.priority] - prioritiesMap[b.priority];
    }
    return 0;
  });

  const getTaskIcon = (title: string, subject?: string) => {
    const text = `${title} ${subject || ''}`.toLowerCase();
    if (text.includes('assignment') || text.includes('homework')) return '📄';
    if (text.includes('record') || text.includes('lab') || text.includes('practical')) return '📝';
    if (text.includes('project') || text.includes('report')) return '💻';
    if (text.includes('exam') || text.includes('test') || text.includes('quiz') || text.includes('study') || text.includes('revise')) return '📚';
    return '🔔';
  };

  return (
    <div className="space-y-8">
      {/* Upper header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Student Planner</h1>
          <p className="text-dark-text-secondary text-sm">Organize assignments, lab records, exams, and class schedules.</p>
        </div>
        <button
          onClick={() => setTaskModal({ open: true })}
          className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-3 rounded-2xl cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Task List Left Panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Search & Sort Panel */}
          <div className="glass rounded-3xl p-4 border border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-dark-text-secondary" />
              <input
                type="text"
                placeholder="Search by title, subject, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full input-field pl-10 text-xs"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-2 shrink-0">
              <ArrowUpDown className="w-4 h-4 text-dark-text-secondary" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="input-field py-2 text-xs"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="dueTime">Sort by Due Time</option>
                <option value="priority">Sort by Priority</option>
              </select>
            </div>
          </div>

          {/* Selection chips (Tabs) */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/50">
            {(['today', 'tomorrow', 'upcoming', 'completed'] as PlannerTab[]).map((tab) => (
              <button
                key={tab}
                disabled={!!selectedDayStr}
                onClick={() => {
                  setActiveTab(tab);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer capitalize ${
                  selectedDayStr
                    ? 'text-dark-text-secondary/40'
                    : activeTab === tab
                    ? 'bg-slate-900 text-white border border-slate-800/80 shadow-md'
                    : 'text-dark-text-secondary hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Date Filter Badge if active */}
          {selectedDayStr && (
            <div className="flex justify-between items-center bg-accent/10 border border-accent/25 rounded-2xl px-4 py-2.5 text-xs text-accent">
              <span className="font-semibold">Showing tasks due on: {selectedDayStr}</span>
              <button
                onClick={() => setSelectedDayStr(null)}
                className="p-1 hover:bg-accent/20 rounded-lg transition-colors cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tasks Container */}
          <div className="space-y-3 min-h-[300px]">
            {sortedTasks.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center text-dark-text-secondary border border-slate-800/50">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-bold">No tasks found matching current filters.</p>
              </div>
            ) : (
              <AnimatePresence>
                {sortedTasks.map((t) => {
                  const isOverdue = t.status === 'Overdue';
                  const priorityColors = {
                    urgent: 'border-error/30 text-error bg-error/5',
                    high: 'border-amber-500/30 text-amber-500 bg-amber-500/5',
                    medium: 'border-primary/30 text-primary bg-primary/5',
                    low: 'border-slate-800 text-dark-text-secondary bg-slate-900/10',
                  };

                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`glass rounded-3xl p-5 border shadow-md flex items-start justify-between transition-all group ${
                        isOverdue ? 'border-error/40 bg-error/5' : 'border-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start space-x-4 min-w-0">
                        {/* Toggle Circle */}
                        <button
                          onClick={() => handleToggleComplete(t.id)}
                          className="mt-1 text-dark-text-secondary hover:text-white shrink-0 cursor-pointer"
                        >
                          {t.status === 'Completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-success fill-success/10" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-700 hover:text-primary" />
                          )}
                        </button>

                        <div className="min-w-0">
                          {/* Title with Emoji */}
                          <h4 className="text-sm font-bold text-white leading-snug flex items-center flex-wrap gap-2">
                            <span>{getTaskIcon(t.title, t.subject)}</span>
                            <span className={t.status === 'Completed' ? 'line-through text-dark-text-secondary font-medium' : ''}>
                              {t.title}
                            </span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-wider ${priorityColors[t.priority]}`}>
                              {t.priority}
                            </span>
                          </h4>

                          {/* Subject Pill */}
                          {t.subject && (
                            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block mt-1">
                              {t.subject}
                            </span>
                          )}

                          {/* Description */}
                          {t.description && (
                            <p className="text-xs text-dark-text-secondary mt-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}

                          {/* Date, Time & Status */}
                          <div className="flex items-center space-x-3 mt-3.5 text-[10px] font-bold uppercase tracking-wider text-dark-text-secondary">
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {t.dueDate} {t.dueTime}
                            </span>
                            {t.reminder !== 'none' && (
                              <span className="text-accent">
                                🔔 {t.reminder} before
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-error flex items-center space-x-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Overdue</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right-side Action buttons */}
                      <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setTaskModal({ open: true, task: t })}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Small Calendar Right Panel */}
        <div className="space-y-4">
          <div className="glass rounded-3xl p-6 border border-slate-800/50 shadow-lg">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setFocusedMonth(new Date(year, month - 1))}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer font-bold text-xs"
              >
                &lt;
              </button>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">{monthLabel}</h3>
              <button
                onClick={() => setFocusedMonth(new Date(year, month + 1))}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer font-bold text-xs"
              >
                &gt;
              </button>
            </div>

            {/* Week Labels */}
            <div className="grid grid-cols-7 gap-2 mb-4 text-center text-xs font-bold text-dark-text-secondary">
              {weekLabels.map((lbl, idx) => <span key={idx}>{lbl}</span>)}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {Array.from({ length: firstWeekdayMapped }).map((_, idx) => (
                <div key={`fill-${idx}`} className="h-9 opacity-0" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                const taskCount = getTaskCountForDay(dateStr);
                const hasTasks = taskCount > 0;
                const isSelected = selectedDayStr === dateStr;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => {
                      if (selectedDayStr === dateStr) {
                        setSelectedDayStr(null);
                      } else {
                        setSelectedDayStr(dateStr);
                      }
                    }}
                    className={`h-9 rounded-full flex flex-col items-center justify-center relative cursor-pointer hover:bg-slate-850 border text-xs font-semibold ${
                      isSelected
                        ? 'border-accent bg-accent/15 text-accent font-bold'
                        : 'border-transparent text-white'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasTasks && (
                      <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2.5 text-[10px] text-dark-text-secondary bg-slate-900/50 p-4 rounded-2xl border border-slate-800/40">
            <CalendarDays className="w-5 h-5 text-primary shrink-0" />
            <p className="m-0 leading-relaxed font-semibold">
              Interactive monthly calendar. Days with active assignments or exams are highlighted. Click to view schedule for that day.
            </p>
          </div>
        </div>

      </div>

      {/* Task Form Modal */}
      {taskModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {taskModal.task ? 'Edit Planner Item' : 'Create Planner Item'}
            </h3>
            
            <form onSubmit={handleSaveTask} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={taskModal.task?.title || ''}
                  placeholder="e.g. DBMS Assignment, ADA Lab Record"
                  className="w-full input-field text-sm"
                  required
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Subject / Category (Optional)</label>
                <input
                  type="text"
                  name="subject"
                  defaultValue={taskModal.task?.subject || ''}
                  placeholder="e.g. DBMS, Maths"
                  className="w-full input-field text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Description (Optional)</label>
                <textarea
                  name="description"
                  defaultValue={taskModal.task?.description || ''}
                  placeholder="Additional details..."
                  className="w-full input-field text-xs h-20 resize-none py-2.5"
                />
              </div>

              {/* Dates grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={taskModal.task?.dueDate || todayStr}
                    className="w-full input-field text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Due Time</label>
                  <input
                    type="time"
                    name="dueTime"
                    defaultValue={taskModal.task?.dueTime || '17:00'}
                    className="w-full input-field text-sm"
                    required
                  />
                </div>
              </div>

              {/* Priorities & Status grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Priority</label>
                  <select
                    name="priority"
                    defaultValue={taskModal.task?.priority || 'medium'}
                    className="w-full input-field text-xs"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Status</label>
                  <select
                    name="status"
                    defaultValue={taskModal.task?.status || 'Pending'}
                    className="w-full input-field text-xs"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Reminders */}
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Reminder Alarm</label>
                <select
                  name="reminder"
                  defaultValue={taskModal.task?.reminder || 'none'}
                  className="w-full input-field text-xs"
                >
                  <option value="none">No reminder</option>
                  <option value="10m">10 minutes before</option>
                  <option value="30m">30 minutes before</option>
                  <option value="1h">1 hour before</option>
                  <option value="1d">1 day before</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTaskModal({ open: false })}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-xs transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                >
                  Save Item
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Planner;
