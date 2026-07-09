import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import { 
  Plus, Trash2, Edit3, Clock, Check, Calendar, 
  CheckCircle2, Circle, Sparkles, Notebook, CheckSquare, Dumbbell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { TaskModel, HabitModel, GoalModel, NoteModel, CalendarEvent, TaskPriority, TaskFilter } from '../types';

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

  // Task Filter state
  const [taskFilter, setTaskFilter] = useState<ActiveTaskFilter>('today');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Daily statistics calculations
  const todayTasks = planner.tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate).toISOString().split('T')[0];
    return d === todayStr;
  });
  
  const completedTodayTasks = todayTasks.filter(t => t.isCompleted).length;
  const activeHabits = planner.habits.filter(h => h.isActive);
  const completedHabits = planner.habitLogs.filter(l => l.isCompleted).length;

  const totalDailyItems = todayTasks.length + activeHabits.length;
  const completedDailyItems = completedTodayTasks + completedHabits;
  const dailyProgress = totalDailyItems > 0 ? Math.round((completedDailyItems / totalDailyItems) * 100) : 0;

  // Render Layout Shell
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Premium Professional Header & Stats Banner */}
      <div className="glass rounded-2xl p-6 border border-slate-800/40 relative overflow-hidden bg-gradient-to-r from-slate-900/80 via-slate-950/40 to-slate-900/80">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-400">Focus Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight m-0">
              Daily Focus Flow
            </h1>
            <p className="text-xs text-dark-text-secondary">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} — Simplify your day, maximize your focus.
            </p>
          </div>

          {/* Daily completion progress widget */}
          <div className="flex items-center space-x-4 bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl min-w-[240px]">
            <div className="relative flex items-center justify-center">
              {/* Circular Progress (fallback to clean badge/text bar) */}
              <div className="text-center">
                <span className="text-2xl font-black text-white">{dailyProgress}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-dark-text-secondary uppercase">
                <span>Daily Finish Line</span>
                <span>{completedDailyItems}/{totalDailyItems} Done</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/30">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Planner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Tasks list (Bento Col Span 6) */}
        <div className="lg:col-span-6 flex flex-col glass rounded-2xl p-5 border border-slate-800/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white m-0">Task Workspace</h2>
            </div>
            {/* Filter pills */}
            <div className="flex space-x-1.5">
              {(['today', 'upcoming', 'completed', 'all'] as ActiveTaskFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-150 capitalize cursor-pointer ${
                    taskFilter === filter
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-900/60 text-dark-text-secondary hover:text-white border border-slate-800/40'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Quick inline task addition */}
          <div className="relative">
            <input
              type="text"
              placeholder="+ Write a task and press Enter..."
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="w-full input-field pr-10 text-xs py-2.5"
            />
          </div>

          {/* Task list container placeholder */}
          <div className="flex-1 space-y-2.5 min-h-[300px]">
            {/* Will be replaced with real interactive checklist in Commit 3 */}
            <div className="animate-pulse space-y-3 py-2">
              <div className="h-10 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
              <div className="h-10 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
              <div className="h-10 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Column 2: Habits grid (Bento Col Span 3) */}
        <div className="lg:col-span-3 flex flex-col glass rounded-2xl p-5 border border-slate-800/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Dumbbell className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white m-0">Habit Streaks</h2>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold px-2 py-0.5 rounded-full">
              {completedHabits}/{activeHabits.length}
            </span>
          </div>

          {/* Habit checklist placeholder */}
          <div className="flex-1 space-y-3">
            {/* Will be replaced with interactive habit cells in Commit 3 */}
            <div className="animate-pulse space-y-3 py-2">
              <div className="h-16 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
              <div className="h-16 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Column 3: Scratchpad & Agenda (Bento Col Span 3) */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Daily Scratchpad Card */}
          <div className="glass rounded-2xl p-5 border border-slate-800/50 flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <Notebook className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white m-0">Daily Scratchpad</h2>
            </div>
            
            {/* Textarea placeholder */}
            <div className="flex-1 min-h-[140px] bg-slate-950/40 border border-slate-850 rounded-xl p-3 animate-pulse">
              <div className="h-3 bg-slate-900 w-3/4 rounded mb-2"></div>
              <div className="h-3 bg-slate-900 w-1/2 rounded"></div>
            </div>
          </div>

          {/* Agenda Timeline Card */}
          <div className="glass rounded-2xl p-5 border border-slate-800/50 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-extrabold text-white m-0">Today's Agenda</h2>
              </div>
              <button className="text-indigo-400 hover:text-indigo-300 p-1 cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Events placeholder */}
            <div className="space-y-2.5 animate-pulse">
              <div className="h-12 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
              <div className="h-12 bg-slate-900/40 border border-slate-850 rounded-xl"></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Planner;
