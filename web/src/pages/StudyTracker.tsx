import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useStudyStore } from '../store/useStudyStore';
import { 
  Flame, Play, Pause, RotateCcw, Plus, Trash2, 
  MinusCircle, PlusCircle, Award 
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import type { SyllabusItem } from '../types';

const StudyTracker: React.FC = () => {
  const { user } = useAuthStore();
  const study = useStudyStore();
  const uid = user?.uid || '';

  const [topicModal, setTopicModal] = useState(false);

  useEffect(() => {
    if (uid) {
      study.loadStudyData(uid);
    }
    // Clean up timer on page leave
    return () => {
      study.pauseTimer();
    };
  }, [uid]);

  // Format seconds remaining to MM:SS
  const formatTimerString = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getProgressFraction = () => {
    const total = study.targetDurationMinutes * 60;
    if (total === 0) return 0;
    return study.secondsRemaining / total;
  };

  const handleSetDuration = async (minutes: number) => {
    if (study.isRunning) {
      toast.error('Cannot change timer while focus block is running.');
      return;
    }
    await study.setDuration(uid, minutes);
    toast.success(`Duration set to ${minutes} minutes`);
  };

  const handleStartPause = () => {
    if (study.isRunning) {
      study.pauseTimer();
      toast('Focus session paused.');
    } else {
      study.startTimer(uid);
      toast.success('Focus session started! Keep studying.');
    }
  };

  const handleReset = () => {
    study.resetTimer();
    toast('Timer reset');
  };

  const handleAdjustProgress = async (name: string, current: number, direction: 'inc' | 'dec') => {
    const step = 0.05;
    const nextVal = direction === 'inc' ? current + step : current - step;
    await study.updateSyllabusProgress(uid, name, nextVal);
  };

  const handleSaveTopic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const progress = parseFloat(formData.get('progress') as string) / 100;
    const color = formData.get('color') as string;

    if (!name.trim()) {
      toast.error('Topic name is required');
      return;
    }

    const newItem: SyllabusItem = {
      name: name.trim(),
      progress: isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress)),
      colorHex: color || '#6366F1',
    };

    try {
      await study.addSyllabusItem(uid, newItem);
      toast.success('Syllabus topic added!');
      setTopicModal(false);
    } catch (err) {
      toast.error('Failed to add topic.');
    }
  };

  const handleDeleteTopic = async (name: string) => {
    if (confirm(`Remove syllabus topic "${name}"?`)) {
      try {
        await study.deleteSyllabusItem(uid, name);
        toast.success('Topic removed.');
      } catch (err) {
        toast.error('Failed to delete topic');
      }
    }
  };

  const fraction = getProgressFraction();
  const radius = 40;
  const strokeDasharray = 2 * Math.PI * radius;
  const strokeDashoffset = strokeDasharray * (1 - fraction);

  return (
    <div className="space-y-8 pb-20">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Study Mode</h1>
          <p className="text-dark-text-secondary text-sm">Focus blocks, streaks and exams syllabus trackers.</p>
        </div>
      </div>

      {/* Grid: Timer Left, Streak Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Focus Timer (Col span 2) */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 md:col-span-2 flex flex-col justify-between items-center text-center shadow-lg shadow-primary/5">
          <div className="w-full flex justify-between items-center border-b border-slate-800/50 pb-4 mb-6">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Pomodoro Timer
            </span>
            <span className="text-xs text-accent font-semibold">Block: {study.targetDurationMinutes} mins</span>
          </div>

          {/* Large Countdown Circular Ring */}
          <div className="relative w-48 h-48 my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="rgba(148, 163, 184, 0.05)"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#6366F1"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4.5xl font-black text-white leading-none font-mono tracking-tighter">
                {formatTimerString(study.secondsRemaining)}
              </span>
              <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider mt-2.5">
                {study.isRunning ? 'Keep focused' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Time Picker Chips */}
          <div className="flex space-x-2 my-6 bg-slate-950 p-1 rounded-2xl border border-slate-850">
            {[25, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleSetDuration(mins)}
                disabled={study.isRunning}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 ${
                  study.targetDurationMinutes === mins
                    ? 'bg-slate-900 text-white border border-slate-800 shadow-md'
                    : 'text-dark-text-secondary hover:text-white'
                }`}
              >
                {mins} Min
              </button>
            ))}
          </div>

          {/* Controls Bar */}
          <div className="flex space-x-4 w-full max-w-xs">
            <button
              onClick={handleReset}
              className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 rounded-2xl text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleStartPause}
              className="flex-1 py-3 bg-primary hover:bg-primary/95 rounded-2xl text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-primary/20"
            >
              {study.isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Streak Counter (Col span 1) */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between items-center text-center shadow-lg">
          <div className="w-full flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Focus Streak
            </span>
            <Award className="w-4.5 h-4.5 text-accent" />
          </div>

          <div className="space-y-3.5 my-4">
            <div className="relative inline-block p-4 bg-primary/10 rounded-full border border-primary/20 animate-pulse">
              <Flame className="w-12 h-12 text-accent fill-accent" />
            </div>
            <h3 className="text-4.5xl font-black text-white tracking-tight leading-none">
              {study.streak} Days
            </h3>
            <p className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider">Current Focus Streak</p>
          </div>

          <div className="w-full bg-slate-900/40 p-4 rounded-2xl border border-slate-800/40 text-left space-y-1">
            <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider block">Daily Goal</span>
            <p className="text-xs text-white leading-relaxed font-semibold m-0">
              Complete 1 focus block daily to level up your streak.
            </p>
          </div>
        </div>

      </div>

      {/* Syllabus Tracker Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white m-0">Syllabus Progress</h3>
            <p className="text-xs text-dark-text-secondary mt-1">Track coverage status for govt and academy exam topics.</p>
          </div>
          <button
            onClick={() => setTopicModal(true)}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Topic</span>
          </button>
        </div>

        <div className="space-y-4">
          {study.syllabus.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-dark-text-secondary border border-slate-800/50">
              <p className="m-0">No syllabus items added yet.</p>
            </div>
          ) : (
            study.syllabus.map((item) => (
              <div
                key={item.name}
                className="glass rounded-2xl p-5 border border-slate-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 group"
              >
                {/* Topic Name & Progress Bar */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <span className="text-xs font-extrabold" style={{ color: item.colorHex }}>
                      {(item.progress * 100).toFixed(0)}% Covered
                    </span>
                  </div>
                  <div className="w-full bg-slate-900/50 rounded-full h-2.5 border border-slate-850">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ backgroundColor: item.colorHex, width: `${item.progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* Adjuster controls */}
                <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleAdjustProgress(item.name, item.progress, 'dec')}
                    className="p-1 hover:bg-slate-850 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
                    title="Decrease coverage"
                  >
                    <MinusCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAdjustProgress(item.name, item.progress, 'inc')}
                    className="p-1 hover:bg-slate-850 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
                    title="Increase coverage"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                  <span className="text-slate-800">|</span>
                  <button
                    onClick={() => handleDeleteTopic(item.name)}
                    className="p-1.5 hover:bg-slate-850 rounded-lg text-dark-text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    title="Delete topic"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Topic Modal */}
      {topicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-4">Add Syllabus Topic</h3>
            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Topic Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Modern Indian History"
                  className="w-full input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Initial Progress (%)</label>
                  <input
                    type="number"
                    name="progress"
                    defaultValue="0"
                    placeholder="e.g. 50"
                    min="0"
                    max="100"
                    className="w-full input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Theme Color</label>
                  <input
                    type="color"
                    name="color"
                    defaultValue="#6366F1"
                    className="w-full h-[46px] p-1 bg-slate-900 border border-slate-800/50 rounded-2xl cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTopicModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                >
                  Add Topic
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StudyTracker;
