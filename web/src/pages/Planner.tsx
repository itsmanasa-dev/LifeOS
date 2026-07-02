import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import { 
  Plus, Trash2, Edit3, Clock, Check, Calendar, 
  CheckCircle2, Circle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { TaskModel, HabitModel, GoalModel, NoteModel, CalendarEvent, TaskPriority, TaskFilter } from '../types';

type ActiveTab = 'tasks' | 'habits' | 'goals' | 'notes' | 'calendar';

const Planner: React.FC = () => {
  const { user } = useAuthStore();
  const planner = usePlannerStore();
  const uid = user?.uid || '';

  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
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

  // Form Sheets / Modals state
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: TaskModel }>({ open: false });
  const [habitModal, setHabitModal] = useState<{ open: boolean }>({ open: false });
  const [goalModal, setGoalModal] = useState<{ open: boolean }>({ open: false });
  const [noteModal, setNoteModal] = useState<{ open: boolean; note?: NoteModel }>({ open: false });
  const [eventModal, setEventModal] = useState<{ open: boolean; event?: CalendarEvent }>({ open: false });

  // ---------------------------------------------------------------------------
  // 1. TASKS TAB SUBSECTION
  // ---------------------------------------------------------------------------
  const [taskCategory, setTaskCategory] = useState<string>('All');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('today');

  const getFilteredTasks = () => {
    let list = [...planner.tasks];
    
    // Timing Filter
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

    // Category Filter
    if (taskCategory !== 'All') {
      list = list.filter(t => t.category?.toLowerCase() === taskCategory.toLowerCase());
    }

    return list;
  };

  const TaskTabContent = () => {
    const categories = ['All', 'College', 'Personal', 'Coding'];
    const timingFilters: { key: TaskFilter; label: string }[] = [
      { key: 'today', label: 'Today' },
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'completed', label: 'Completed' },
      { key: 'all', label: 'All Tasks' }
    ];

    const filtered = getFilteredTasks();
    const pendingCount = planner.tasks.filter(t => !t.isCompleted).length;

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

    return (
      <div className="space-y-6">
        {/* Header summary */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white m-0">Today's Focus</h2>
            <p className="text-xs text-dark-text-secondary mt-1 font-medium">
              {pendingCount > 0 ? `You have ${pendingCount} tasks remaining.` : 'All done! Enjoy your day.'}
            </p>
          </div>
          <button
            onClick={() => setTaskModal({ open: true })}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Horizontal Category Selectors */}
        <div className="flex overflow-x-auto space-x-2 py-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setTaskCategory(cat)}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                taskCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-dark-card/60 text-dark-text-secondary hover:text-white border border-slate-800/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Horizontal Timing Selectors */}
        <div className="flex space-x-2 border-b border-slate-800/50 pb-3">
          {timingFilters.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTaskFilter(tf.key)}
              className={`text-xs font-semibold pb-1.5 border-b-2 px-1 transition-all duration-200 cursor-pointer ${
                taskFilter === tf.key
                  ? 'border-accent text-accent font-extrabold'
                  : 'border-transparent text-dark-text-secondary hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-dark-text-secondary border border-slate-800/50">
              <p className="m-0">No tasks found. Tap Add Task to begin.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between group hover:border-slate-700/60 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => planner.toggleComplete(uid, task.id)}
                      className="text-dark-text-secondary hover:text-white focus:outline-none cursor-pointer"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-sm font-bold truncate ${
                          task.isCompleted ? 'line-through text-dark-text-secondary font-medium' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-dark-text-secondary mt-0.5 truncate max-w-sm">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2.5 mt-2">
                        {/* Priority circle */}
                        <div className="flex items-center space-x-1 text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              task.priority === 'urgent' || task.priority === 'high'
                                ? 'bg-error'
                                : task.priority === 'medium'
                                ? 'bg-warning'
                                : 'bg-success'
                            }`}
                          />
                          <span>{task.priority}</span>
                        </div>
                        {task.category && (
                          <span className="bg-primary/10 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                            {task.category}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-dark-text-secondary flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => setTaskModal({ open: true, task })}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await planner.deleteTask(task.id);
                        toast.success('Task deleted');
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Task Form Modal */}
        {taskModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {taskModal.task ? 'Edit Task' : 'Add Task'}
              </h3>
              <form onSubmit={handleSaveTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={taskModal.task?.title || ''}
                    placeholder="Enter task title"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Description</label>
                  <textarea
                    name="description"
                    defaultValue={taskModal.task?.description || ''}
                    placeholder="Add details (optional)"
                    className="w-full input-field min-h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Category</label>
                    <input
                      type="text"
                      name="category"
                      defaultValue={taskModal.task?.category || ''}
                      placeholder="e.g. Work, College"
                      className="w-full input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={taskModal.task?.dueDate ? taskModal.task.dueDate.split('T')[0] : ''}
                      className="w-full input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Priority</label>
                  <select
                    name="priority"
                    defaultValue={taskModal.task?.priority || 'medium'}
                    className="w-full input-field"
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
                    className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    {taskModal.task ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // 2. HABITS TAB SUBSECTION
  // ---------------------------------------------------------------------------
  const HabitTabContent = () => {
    const activeHabits = planner.habits.filter(h => h.isActive);
    const completedCount = planner.habitLogs.filter(l => l.isCompleted).length;
    const progress = activeHabits.length > 0 ? (completedCount / activeHabits.length) * 100 : 0;

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
        icon: icon.trim() || '📝',
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

    const handleToggleCheck = async (habitId: string) => {
      try {
        await planner.toggleHabit(uid, habitId, todayStr);
      } catch (err) {
        toast.error('Failed to toggle habit');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white m-0">Habits Tracker</h2>
            <p className="text-xs text-dark-text-secondary mt-1 font-medium">Build daily disciplines and track consistency.</p>
          </div>
          <button
            onClick={() => setHabitModal({ open: true })}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>

        {/* Progress Card */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between shadow-lg shadow-black/10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">Today's Progress</span>
            <span className="text-xs font-extrabold text-white">{completedCount}/{activeHabits.length} Done</span>
          </div>
          <div className="w-full bg-slate-900/50 rounded-full h-3 mb-2 border border-slate-800/40">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-dark-text-secondary m-0">
            Keep it up! Consistency is key to building neural pathways.
          </p>
        </div>

        {/* Habit chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {activeHabits.map((habit) => {
            const isCompleted = planner.habitLogs.some((l) => l.habitId === habit.id && l.isCompleted);
            return (
              <motion.div
                key={habit.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleToggleCheck(habit.id)}
                className={`p-4 rounded-2xl border cursor-pointer text-center flex flex-col items-center justify-center relative transition-all duration-300 ${
                  isCompleted
                    ? 'border-accent/40 shadow-lg shadow-accent/5'
                    : 'border-slate-800/50 hover:border-slate-700/60'
                }`}
                style={{ backgroundColor: isCompleted ? `${habit.color}15` : 'rgba(27, 36, 51, 0.4)' }}
              >
                {/* Delete button top right */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete habit "${habit.name}"?`)) {
                      await planner.deleteHabit(habit.id);
                      toast.success('Habit deleted');
                    }
                  }}
                  className="absolute top-2 right-2 p-1 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <span className="text-3xl mb-3 block">{habit.icon}</span>
                <h4 className="text-sm font-bold text-white mb-1 truncate w-full">{habit.name}</h4>
                <div
                  className={`mt-2 p-1 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCompleted ? 'bg-accent/20 text-accent' : 'text-slate-650'
                  }`}
                  style={{ color: isCompleted ? habit.color : undefined }}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-30" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Habit Form Modal */}
        {habitModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Add Habit</h3>
              <form onSubmit={handleSaveHabit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Habit Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Read Book, Gym"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Emoji Icon</label>
                    <input
                      type="text"
                      name="icon"
                      placeholder="e.g. 📚"
                      className="w-full input-field text-center text-lg"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Theme Color</label>
                    <input
                      type="color"
                      name="color"
                      defaultValue="#06B6D4"
                      className="w-full h-[46px] p-1 bg-slate-900 border border-slate-800/50 rounded-2xl cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setHabitModal({ open: false })}
                    className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    Add Habit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // 3. GOALS TAB SUBSECTION
  // ---------------------------------------------------------------------------
  const GoalTabContent = () => {
    const handleSaveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const targetDate = formData.get('targetDate') as string;

      if (!title.trim()) {
        toast.error('Goal title is required');
        return;
      }

      const newGoal: GoalModel = {
        id: `goal-${Date.now()}`,
        title: title.trim(),
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        isCompleted: false,
        createdAt: new Date().toISOString()
      };

      try {
        await planner.upsertGoal(uid, newGoal);
        toast.success('Goal created!');
        setGoalModal({ open: false });
      } catch (err) {
        toast.error('Failed to create goal');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white m-0">Milestones & Goals</h2>
            <p className="text-xs text-dark-text-secondary mt-1 font-medium">Define high-level objectives and review progress.</p>
          </div>
          <button
            onClick={() => setGoalModal({ open: true })}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </button>
        </div>

        {/* Goals List */}
        <div className="space-y-3">
          {planner.goals.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-dark-text-secondary border border-slate-800/50">
              <p className="m-0">No active goals. Add some targets to motivate yourself!</p>
            </div>
          ) : (
            planner.goals.map((goal) => (
              <div
                key={goal.id}
                className="glass rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <button
                    onClick={() => planner.toggleGoal(goal.id)}
                    className="text-dark-text-secondary hover:text-white cursor-pointer"
                  >
                    {goal.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        goal.isCompleted ? 'line-through text-dark-text-secondary' : 'text-white'
                      }`}
                    >
                      {goal.title}
                    </h4>
                    {goal.targetDate && (
                      <span className="text-[10px] text-dark-text-secondary flex items-center space-x-1 mt-0.5 font-semibold">
                        <Calendar className="w-3 h-3 text-accent" />
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await planner.deleteGoal(goal.id);
                    toast.success('Goal deleted');
                  }}
                  className="p-2 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Goal Form Modal */}
        {goalModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">New Goal</h3>
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Goal Title</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. Score 90%+ in Finals"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Target Date</label>
                  <input
                    type="date"
                    name="targetDate"
                    className="w-full input-field"
                  />
                </div>
                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setGoalModal({ open: false })}
                    className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    Create Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // 4. NOTES TAB SUBSECTION
  // ---------------------------------------------------------------------------
  const NoteTabContent = () => {
    const handleSaveNote = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;

      if (!title.trim() && !content.trim()) {
        toast.error('Cannot save empty note');
        return;
      }

      const newNote: NoteModel = {
        id: noteModal.note?.id || `note-${Date.now()}`,
        title: title.trim() || 'Untitled Note',
        content: content.trim() || '',
        createdAt: noteModal.note?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await planner.upsertNote(uid, newNote);
        toast.success(noteModal.note ? 'Note saved!' : 'Note created!');
        setNoteModal({ open: false });
      } catch (err) {
        toast.error('Failed to save note');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white m-0">Notebook</h2>
            <p className="text-xs text-dark-text-secondary mt-1 font-medium">Jot down quick ideas, plans or study cards.</p>
          </div>
          <button
            onClick={() => setNoteModal({ open: true })}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>

        {/* Notes Grid */}
        {planner.notes.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-dark-text-secondary border border-slate-800/50">
            <p className="m-0">Your notebook is empty. Click New Note to draft ideas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {planner.notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setNoteModal({ open: true, note })}
                className="glass rounded-2xl p-5 border border-slate-800/50 hover:border-slate-700/60 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-36 group relative"
              >
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">{note.title}</h4>
                  <p className="text-xs text-dark-text-secondary line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-4 border-t border-slate-800/50 pt-3">
                  <span className="text-[9px] text-dark-text-secondary font-semibold">
                    Last update: {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Delete note "${note.title}"?`)) {
                        await planner.deleteNote(note.id);
                        toast.success('Note deleted');
                      }
                    }}
                    className="p-1 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity duration-250 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note Form modal */}
        {noteModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {noteModal.note ? 'Edit Note' : 'Draft Note'}
              </h3>
              <form onSubmit={handleSaveNote} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={noteModal.note?.title || ''}
                    placeholder="Enter note title"
                    className="w-full input-field font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Content</label>
                  <textarea
                    name="content"
                    defaultValue={noteModal.note?.content || ''}
                    placeholder="Start typing your notes here..."
                    className="w-full input-field min-h-60 text-sm whitespace-pre-wrap"
                  />
                </div>
                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setNoteModal({ open: false })}
                    className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // 5. CALENDAR TAB SUBSECTION
  // ---------------------------------------------------------------------------
  const CalendarTabContent = () => {
    // Current focused month
    const [focusedDate, setFocusedDate] = useState<Date>(new Date());
    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    const firstWeekdayMapped = firstWeekday === 0 ? 6 : firstWeekday - 1; // Map Sun to 6, Mon to 0

    const monthLabel = focusedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const date = formData.get('date') as string;
      const startTime = formData.get('startTime') as string;
      const endTime = formData.get('endTime') as string;
      const category = formData.get('category') as string;
      const description = formData.get('description') as string;

      if (!title.trim() || !date) {
        toast.error('Title and Date are required');
        return;
      }

      const newEvent: CalendarEvent = {
        id: eventModal.event?.id || `event-${Date.now()}`,
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined
      };

      try {
        await planner.upsertEvent(uid, newEvent);
        toast.success(eventModal.event ? 'Event updated!' : 'Event created!');
        setEventModal({ open: false });
      } catch (err) {
        toast.error('Failed to save event');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white m-0">Event Calendar</h2>
            <p className="text-xs text-dark-text-secondary mt-1 font-medium">Keep track of upcoming deadlines, exams and classes.</p>
          </div>
          <button
            onClick={() => setEventModal({ open: true })}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>

        {/* Calendar Card Container */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50">
          {/* Calendar Header Month Toggler */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setFocusedDate(new Date(year, month - 1))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
            >
              &lt;
            </button>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{monthLabel}</h3>
            <button
              onClick={() => setFocusedDate(new Date(year, month + 1))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
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
            {/* Filler Slots */}
            {Array.from({ length: firstWeekdayMapped }).map((_, idx) => (
              <div key={`fill-${idx}`} className="h-10 opacity-0" />
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              
              // Find events on this day
              const dayEvents = planner.calendarEvents.filter((e) => e.date === dateStr);
              const isToday = todayStr === dateStr;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => {
                    // Pre-fill date when creating event from day click
                    setEventModal({ open: true, event: { id: '', title: '', date: dateStr } });
                  }}
                  className={`h-10 rounded-full flex flex-col items-center justify-center relative cursor-pointer hover:bg-slate-800/40 border ${
                    isToday ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-transparent text-white'
                  }`}
                >
                  <span>{dayNum}</span>
                  {dayEvents.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary absolute bottom-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Events list below Calendar */}
        <div className="space-y-4">
          <h3 className="text-md font-bold text-white mb-2">Scheduled Events</h3>
          <div className="space-y-3">
            {planner.calendarEvents.length === 0 ? (
              <p className="text-xs text-dark-text-secondary italic">No events scheduled.</p>
            ) : (
              planner.calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="glass rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                      <p className="text-xs text-dark-text-secondary mt-0.5">
                        {new Date(evt.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        {evt.startTime && ` at ${evt.startTime}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await planner.deleteEvent(evt.id);
                      toast.success('Event deleted');
                    }}
                    className="p-2 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Form Modal */}
        {eventModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Add Event</h3>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={eventModal.event?.title || ''}
                    placeholder="e.g. Midterm Exam, Meeting"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={eventModal.event?.date || ''}
                    className="w-full input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      defaultValue={eventModal.event?.startTime || ''}
                      className="w-full input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={eventModal.event?.endTime || ''}
                      className="w-full input-field"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEventModal({ open: false })}
                    className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    Add Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'habits':
        return <HabitTabContent />;
      case 'goals':
        return <GoalTabContent />;
      case 'notes':
        return <NoteTabContent />;
      case 'calendar':
        return <CalendarTabContent />;
      default:
        return <TaskTabContent />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Daily Planner</h1>
        <p className="text-dark-text-secondary text-sm">Organize tasks, schedule events, list notebook entries and build habits.</p>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-800/80 scrollbar-none overflow-x-auto space-x-4">
        {(['tasks', 'habits', 'goals', 'notes', 'calendar'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-bold pb-3 px-1 border-b-2 transition-all duration-200 capitalize cursor-pointer shrink-0 ${
              activeTab === tab
                ? 'border-accent text-accent font-extrabold'
                : 'border-transparent text-dark-text-secondary hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Tab Render Workspace */}
      <div className="pt-2">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Planner;
