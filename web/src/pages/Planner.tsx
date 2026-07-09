import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import { 
  Plus, Trash2, Edit3, Check, 
  CheckCircle2, Circle, Sparkles, Notebook, CheckSquare, Dumbbell, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { TaskModel, HabitModel, NoteModel, CalendarEvent, TaskPriority } from '../types';

type ActiveTaskFilter = 'today' | 'upcoming' | 'completed' | 'all';

const Planner: React.FC = () => {
  const { user } = useAuthStore();
  const planner = usePlannerStore();
  const uid = user?.uid || '';

  const todayStr = new Date().toISOString().split('T')[0];

  // Core Data loaders
  useEffect(() => {
    if (uid) {
      planner.loadTasks(uid);
      planner.loadHabits(uid);
      planner.loadHabitLogs(uid, todayStr);
      planner.loadGoals(uid);
      planner.loadNotes(uid);
      planner.loadEvents(uid);
    }
  }, [uid]);

  // Task state
  const [taskFilter, setTaskFilter] = useState<ActiveTaskFilter>('today');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  
  // Modals state
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: TaskModel }>({ open: false });
  const [habitModal, setHabitModal] = useState<{ open: boolean }>({ open: false });
  const [eventModal, setEventModal] = useState<{ open: boolean }>({ open: false });

  // Debounced Scratchpad Text State
  const [scratchpadText, setScratchpadText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Load today's scratchpad note when notes load
  useEffect(() => {
    const scratchId = `scratchpad-${todayStr}`;
    const existingNote = planner.notes.find(n => n.id === scratchId);
    if (existingNote) {
      setScratchpadText(existingNote.content);
    } else {
      setScratchpadText('');
    }
  }, [planner.notes, todayStr]);

  // Debounce Note Auto-Save
  useEffect(() => {
    if (!uid) return;
    const scratchId = `scratchpad-${todayStr}`;
    const existingNote = planner.notes.find(n => n.id === scratchId);
    
    // Skip if unchanged
    if (existingNote && existingNote.content === scratchpadText) return;
    if (!existingNote && scratchpadText === '') return;

    setIsSavingNote(true);
    const timer = setTimeout(async () => {
      try {
        const updatedNote: NoteModel = {
          id: scratchId,
          title: `Daily Scratchpad (${todayStr})`,
          content: scratchpadText,
          createdAt: existingNote?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await planner.upsertNote(uid, updatedNote);
      } catch (err) {
        console.error('Scratchpad save error:', err);
      } finally {
        setIsSavingNote(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [scratchpadText, uid, todayStr]);

  // Quick Inline Task Creator (handles hitting Enter)
  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const newTask: TaskModel = {
      id: `task-${Date.now()}`,
      title: quickTaskTitle.trim(),
      priority: 'medium',
      isCompleted: false,
      category: 'Personal',
      dueDate: new Date().toISOString(), // Default: Today
      createdAt: new Date().toISOString()
    };

    try {
      await planner.upsertTask(uid, newTask);
      setQuickTaskTitle('');
      toast.success('Task added!');
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  // Full Task Modals Save handler
  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as TaskPriority;
    const category = formData.get('category') as string;
    const dateVal = formData.get('dueDate') as string;

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    const newTask: TaskModel = {
      id: taskModal.task?.id || `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      isCompleted: taskModal.task?.isCompleted || false,
      category: category.trim() || undefined,
      dueDate: dateVal ? new Date(dateVal).toISOString() : undefined,
      createdAt: taskModal.task?.createdAt || new Date().toISOString()
    };

    try {
      await planner.upsertTask(uid, newTask);
      toast.success(taskModal.task ? 'Task updated!' : 'Task created!');
      setTaskModal({ open: false });
    } catch (err) {
      toast.error('Failed to save task');
    }
  };

  // Habit Add handler
  const handleSaveHabit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const icon = formData.get('icon') as string;
    const color = formData.get('color') as string;

    if (!name.trim()) {
      toast.error('Habit name is required');
      return;
    }

    const newHabit: HabitModel = {
      id: `habit-${Date.now()}`,
      name: name.trim(),
      icon: icon.trim() || '🎯',
      color,
      isActive: true
    };

    try {
      await planner.addHabit(uid, newHabit);
      toast.success('Habit added!');
      setHabitModal({ open: false });
    } catch (err) {
      toast.error('Failed to add habit');
    }
  };

  // Event Add handler
  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;

    if (!title.trim() || !date) {
      toast.error('Title and Date are required');
      return;
    }

    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: title.trim(),
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined
    };

    try {
      await planner.upsertEvent(uid, newEvent);
      toast.success('Event scheduled!');
      setEventModal({ open: false });
    } catch (err) {
      toast.error('Failed to save event');
    }
  };

  // Get and filter tasks
  const getFilteredTasks = () => {
    let list = [...planner.tasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (taskFilter === 'today') {
      list = list.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime() && !t.isCompleted;
      });
    } else if (taskFilter === 'upcoming') {
      list = list.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() > today.getTime() && !t.isCompleted;
      });
    } else if (taskFilter === 'completed') {
      list = list.filter(t => t.isCompleted);
    }
    return list;
  };

  // Statistics Calculations
  const todayTasks = planner.tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate).toISOString().split('T')[0];
    return d === todayStr;
  });
  
  const completedTodayTasks = todayTasks.filter(t => t.isCompleted).length;
  const activeHabits = planner.habits.filter(h => h.isActive);
  const completedHabitsCount = planner.habitLogs.filter(l => l.isCompleted).length;

  const totalDailyItems = todayTasks.length + activeHabits.length;
  const completedDailyItems = completedTodayTasks + completedHabitsCount;
  const dailyProgress = totalDailyItems > 0 ? Math.round((completedDailyItems / totalDailyItems) * 100) : 0;

  // Filtered lists
  const filteredTasksList = getFilteredTasks();
  const todayEventsList = planner.calendarEvents.filter(e => e.date === todayStr);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Refined Bento Header & Daily Metrics */}
      <div className="glass rounded-2xl p-6 border border-slate-800/40 relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-extrabold tracking-wider uppercase">Focus Flow Planner</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight m-0">
              Your Daily Flow
            </h1>
            <p className="text-xs text-dark-text-secondary">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} — Make progress, build consistency.
            </p>
          </div>

          {/* Combined Progress Card */}
          <div className="flex items-center space-x-4 bg-slate-900/40 border border-slate-800/40 p-4 rounded-xl min-w-[260px]">
            <div className="text-center bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3.5 py-2">
              <span className="text-2xl font-black text-indigo-400">{dailyProgress}%</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-dark-text-secondary uppercase tracking-wider">
                <span>Daily Progress</span>
                <span className="text-white">{completedDailyItems}/{totalDailyItems} items</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/40">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Tasks (Col 6) */}
        <div className="lg:col-span-6 flex flex-col glass rounded-2xl p-5 border border-slate-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white m-0">Tasks</h2>
            </div>
            
            {/* Minimal Filter Pills */}
            <div className="flex space-x-1">
              {(['today', 'upcoming', 'completed', 'all'] as ActiveTaskFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all duration-200 capitalize cursor-pointer ${
                    taskFilter === filter
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900/50 text-dark-text-secondary hover:text-white border border-slate-800/40'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Inline Creation Input */}
          <form onSubmit={handleQuickTaskSubmit} className="relative">
            <input
              type="text"
              placeholder="+ Quick add task... (press Enter)"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="w-full input-field pr-12 text-xs py-2.5"
            />
            <button
              type="button"
              onClick={() => setTaskModal({ open: true })}
              className="absolute right-2 top-1.5 p-1 text-dark-text-secondary hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Add detailed task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Checklist Area */}
          <div className="flex-1 space-y-2.5 min-h-[340px] max-h-[500px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredTasksList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-dark-text-secondary border border-dashed border-slate-800/50 rounded-xl">
                  <span className="text-xs">No active tasks found in this view.</span>
                </div>
              ) : (
                filteredTasksList.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="p-3 bg-slate-900/40 border border-slate-800/40 hover:border-slate-800 rounded-xl flex items-center justify-between gap-3 group transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <button
                        onClick={() => planner.toggleComplete(uid, task.id)}
                        className="text-dark-text-secondary hover:text-indigo-400 focus:outline-none cursor-pointer flex-shrink-0"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 fill-indigo-500/10" />
                        ) : (
                          <Circle className="w-4 h-4 opacity-50 hover:opacity-100" />
                        )}
                      </button>
                      
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-medium block truncate ${
                          task.isCompleted ? 'line-through text-dark-text-secondary opacity-60' : 'text-slate-200'
                        }`}>
                          {task.title}
                        </span>
                        
                        {/* Task metadata markers */}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.priority === 'urgent' || task.priority === 'high' ? 'bg-red-500' :
                            task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="text-[9px] uppercase tracking-wider text-dark-text-secondary font-bold">
                            {task.priority}
                          </span>
                          {task.category && (
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-extrabold uppercase">
                              {task.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Edit/Delete Row */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => setTaskModal({ open: true, task })}
                        className="p-1 hover:bg-slate-850 rounded text-dark-text-secondary hover:text-white cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await planner.deleteTask(task.id);
                          toast.success('Task deleted');
                        }}
                        className="p-1 hover:bg-slate-850 rounded text-dark-text-secondary hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Habits (Col 3) */}
        <div className="lg:col-span-3 flex flex-col glass rounded-2xl p-5 border border-slate-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Dumbbell className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white m-0">Habits</h2>
            </div>
            <button
              onClick={() => setHabitModal({ open: true })}
              className="p-1 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Habits Grid */}
          <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {activeHabits.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-dark-text-secondary border border-dashed border-slate-800/50 rounded-xl">
                <span className="text-xs">No active habits.</span>
              </div>
            ) : (
              activeHabits.map((habit) => {
                const isCompleted = planner.habitLogs.some((l) => l.habitId === habit.id && l.isCompleted);
                return (
                  <motion.div
                    key={habit.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => planner.toggleHabit(uid, habit.id, todayStr)}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between relative transition-all duration-300 group ${
                      isCompleted 
                        ? 'border-indigo-500/30 shadow-md shadow-indigo-500/5' 
                        : 'border-slate-800/40 hover:border-slate-800'
                    }`}
                    style={{ backgroundColor: isCompleted ? `${habit.color}10` : 'rgba(14, 18, 30, 0.45)' }}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-2xl">{habit.icon}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{habit.name}</span>
                        <span className="text-[9px] text-dark-text-secondary">Click to log</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <div 
                        className={`p-1 rounded-full ${isCompleted ? 'text-indigo-400' : 'text-slate-700'}`}
                        style={{ color: isCompleted ? habit.color : undefined }}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-40" />}
                      </div>

                      {/* Delete button (displays on hover) */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Delete habit "${habit.name}"?`)) {
                            await planner.deleteHabit(habit.id);
                            toast.success('Habit deleted');
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-dark-text-secondary hover:text-red-400 cursor-pointer transition-opacity duration-150"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Scratchpad & Agenda (Col 3) */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Scratchpad */}
          <div className="glass rounded-2xl p-5 border border-slate-800/40 flex flex-col space-y-3 bg-slate-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Notebook className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-extrabold text-white m-0">Scratchpad</h2>
              </div>
              {isSavingNote && (
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded animate-pulse">
                  Saving...
                </span>
              )}
            </div>

            <textarea
              placeholder="Jot down quick thoughts or a reflection today. It auto-saves..."
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              className="w-full h-36 bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none transition-all duration-200"
            />
          </div>

          {/* Agenda */}
          <div className="glass rounded-2xl p-5 border border-slate-800/40 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-extrabold text-white m-0">Today's Agenda</h2>
              </div>
              <button
                onClick={() => setEventModal({ open: true })}
                className="p-1 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Events timeline list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {todayEventsList.length === 0 ? (
                <div className="py-6 text-center text-dark-text-secondary text-xs border border-dashed border-slate-800/50 rounded-xl">
                  No events scheduled today.
                </div>
              ) : (
                todayEventsList.map((evt) => (
                  <div 
                    key={evt.id} 
                    className="p-2.5 bg-slate-900/40 border border-slate-800/40 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-200 block truncate">{evt.title}</span>
                      {evt.startTime && (
                        <span className="text-[9px] text-dark-text-secondary block mt-0.5">
                          {evt.startTime} {evt.endTime ? ` - ${evt.endTime}` : ''}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={async () => {
                        await planner.deleteEvent(evt.id);
                        toast.success('Event deleted');
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-dark-text-secondary hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Task Creation & Editing Modal */}
      {taskModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          >
            <h3 className="text-lg font-bold text-white mb-4">
              {taskModal.task ? 'Edit Task' : 'Add Task'}
            </h3>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={taskModal.task?.title || ''}
                  placeholder="Task title"
                  className="w-full input-field text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Description</label>
                <textarea
                  name="description"
                  defaultValue={taskModal.task?.description || ''}
                  placeholder="Notes (optional)"
                  className="w-full input-field text-xs min-h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Category</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={taskModal.task?.category || 'Personal'}
                    className="w-full input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={taskModal.task?.dueDate ? taskModal.task.dueDate.split('T')[0] : todayStr}
                    className="w-full input-field text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Priority</label>
                <select
                  name="priority"
                  defaultValue={taskModal.task?.priority || 'medium'}
                  className="w-full input-field text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTaskModal({ open: false })}
                  className="flex-1 border border-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Habit Creation Modal */}
      {habitModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">New Habit</h3>
            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Habit Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Drink Water, Gym"
                  className="w-full input-field text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Emoji Icon</label>
                  <input
                    type="text"
                    name="icon"
                    placeholder="💧"
                    className="w-full input-field text-center text-xs"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Theme Color</label>
                  <input
                    type="color"
                    name="color"
                    defaultValue="#6366F1"
                    className="w-full h-[38px] p-1 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setHabitModal({ open: false })}
                  className="flex-1 border border-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Agenda Event Scheduling Modal */}
      {eventModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">Add Agenda Event</h3>
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Event Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Class, Team Call"
                  className="w-full input-field text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={todayStr}
                  className="w-full input-field text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    className="w-full input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    className="w-full input-field text-xs"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEventModal({ open: false })}
                  className="flex-1 border border-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Schedule Event
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
