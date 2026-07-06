import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStudyStore } from '../store/useStudyStore';
import { 
  Flame, Play, Pause, Square, Plus, Trash2, Edit3, CheckCircle2, 
  Search, AlertCircle, 
  Clock, Eye, AlertTriangle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import type { SyllabusNote, SyllabusNotePriority, SyllabusNoteStatus } from '../types';

const StudyTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const study = useStudyStore();
  const uid = user?.uid || '';

  // Tab State: 'timer' | 'notes' | 'completed' | 'analytics'
  const [activeTab, setActiveTab] = useState<'timer' | 'notes' | 'completed' | 'analytics'>('timer');
  
  // Custom Daily Goal State (Modal/Input)
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [customGoalHours, setCustomGoalHours] = useState('4');

  // Timer Related states
  const [showFocusChecklist, setShowFocusChecklist] = useState(false);
  const [selectedFocusMode, setSelectedFocusMode] = useState<'dnd' | 'focus' | 'airplane' | null>(null);
  const [dndConfirmed, setDndConfirmed] = useState(false);
  const [airplaneVerified, setAirplaneVerified] = useState(false);
  const [isAirplaneChecking, setIsAirplaneChecking] = useState(false);



  // Tab Focus Distraction Stats
  const lastActiveTimestamp = useRef<number>(Date.now());
  const hiddenTimeAccumulated = useRef<number>(0);

  // Syllabus Notes States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<SyllabusNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [notePriority, setNotePriority] = useState<SyllabusNotePriority>('medium');
  const [noteStatus, setNoteStatus] = useState<SyllabusNoteStatus>('Not Started');
  
  // Complete Syllabus note modal
  const [showCompleteNoteModal, setShowCompleteNoteModal] = useState<string | null>(null);
  const [noteTimeTaken, setNoteTimeTaken] = useState('60'); // in minutes

  // Completed Syllabus Search / Filters
  const [completedSearch, setCompletedSearch] = useState('');
  const [completedSubjectFilter, setCompletedSubjectFilter] = useState('all');
  const [completedPriorityFilter, setCompletedPriorityFilter] = useState('all');







  // Init
  useEffect(() => {
    if (uid) {
      study.loadStudyData(uid);
    }
  }, [uid]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => {
      study.setOnlineStatus(true);
      toast.success('Internet connected. Syncing offline data.');
    };
    const handleOffline = () => {
      study.setOnlineStatus(false);
      toast.error('Internet disconnected. Working in Offline Mode.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor tab change distractions
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isRunning = study.activeSession?.isRunning ?? false;
      if (!isRunning) return;

      if (document.hidden) {
        lastActiveTimestamp.current = Date.now();
      } else {
        const awayTime = Math.floor((Date.now() - lastActiveTimestamp.current) / 1000);
        if (awayTime > 5) {
          hiddenTimeAccumulated.current += awayTime;
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 border border-amber-500/20 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
              <div className="flex-1 w-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-white">Focus Nudge</p>
                    <p className="mt-1 text-xs text-dark-text-secondary">
                      You left this study tab for <span className="text-amber-400 font-semibold">{awayTime} seconds</span>. Don't let distractions break your focus!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ), { duration: 5000 });

          // Play warning sound
          playNotificationSound();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [study.activeSession?.isRunning]);

  // Audio helper
  const playNotificationSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, context.currentTime); // C5
      osc.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      osc.start();
      osc.stop(context.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio context alert could not play:', e);
    }
  };

  // Helper date conversions
  const getTodayDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimerString = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const getProgressPercentage = () => {
    const todayStudied = study.dailyTotals[getTodayDateString()] || 0;
    const currentActive = study.secondsActive;
    const totalToday = todayStudied + currentActive;
    return Math.min(100, Math.round((totalToday / study.dailyGoal) * 100));
  };

  const getExpectedCompletionTime = () => {
    const todayStudied = study.dailyTotals[getTodayDateString()] || 0;
    const currentActive = study.secondsActive;
    const totalToday = todayStudied + currentActive;
    const remainingSeconds = Math.max(0, study.dailyGoal - totalToday);
    
    if (remainingSeconds === 0) return 'Daily goal reached!';
    
    const completionDate = new Date(Date.now() + remainingSeconds * 1000);
    return completionDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: study.timeDisplayFormat === '12h'
    });
  };

  // Pre-timer start focus options
  const handleStartTimerClick = () => {
    if (study.activeSession) {
      // Resume timer
      study.startTimer(uid);
      toast.success('Focus segment resumed!');
    } else {
      // Prompt checklist
      setShowFocusChecklist(true);
    }
  };

  const verifyAirplaneMode = () => {
    setIsAirplaneChecking(true);
    setTimeout(() => {
      setIsAirplaneChecking(false);
      if (!navigator.onLine) {
        setAirplaneVerified(true);
        toast.success('Airplane Mode Verified! Device is offline.');
      } else {
        setAirplaneVerified(false);
        toast.error('Device is still online. Enable Airplane Mode or confirm manually.');
      }
    }, 1500);
  };

  const handleFocusChecklistConfirm = () => {
    setShowFocusChecklist(false);
    study.startTimer(uid, 'Continuous study session');
    toast.success('Study session started! Stay focused.');
    // Reset confirmation variables
    setSelectedFocusMode(null);
    setDndConfirmed(false);
    setAirplaneVerified(false);
  };

  // Timer Pause / Stop Actions
  const handlePauseClick = () => {
    study.pauseTimer(uid);
    toast('Session paused.');
  };

  const handleStopClick = () => {
    if (confirm('Are you sure you want to stop and save your study session?')) {
      study.stopAndSaveTimer(uid, 'Continuous study tracker log');
      toast.success('Session saved to cloud!');
    }
  };

  // Goal config updates
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseFloat(customGoalHours);
    if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
      toast.error('Please enter a valid duration between 0.1 and 24 hours');
      return;
    }
    const seconds = Math.round(hrs * 3600);
    study.setDailyGoal(uid, seconds);
    setShowGoalModal(false);
    toast.success(`Daily goal updated to ${hrs} hours`);
  };

  // Syllabus Notes Add/Edit Actions
  const openNoteAddModal = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteSubject('');
    setNoteDescription('');
    setNotePriority('medium');
    setNoteStatus('Not Started');
    setShowNoteModal(true);
  };

  const openNoteEditModal = (note: SyllabusNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteSubject(note.subject);
    setNoteDescription(note.description);
    setNotePriority(note.priority);
    setNoteStatus(note.status);
    setShowNoteModal(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteSubject.trim()) {
      toast.error('Title and Subject are required');
      return;
    }

    const notePayload = {
      title: noteTitle.trim(),
      subject: noteSubject.trim(),
      description: noteDescription.trim(),
      priority: notePriority,
      status: noteStatus,
      timeTaken: editingNote?.timeTaken || 0
    };

    if (editingNote) {
      // Edit
      await study.updateSyllabusNote(uid, editingNote.id, notePayload);
      toast.success('Syllabus Note updated.');
    } else {
      // Add
      await study.addSyllabusNote(uid, notePayload);
      toast.success('New Syllabus Note created.');
    }
    setShowNoteModal(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Delete this syllabus note?')) {
      await study.deleteSyllabusNote(uid, noteId);
      toast.success('Note deleted');
    }
  };

  // Complete Note logic
  const triggerCompleteNote = (noteId: string) => {
    setNoteTimeTaken('60'); // default 60 minutes
    setShowCompleteNoteModal(noteId);
  };

  const handleConfirmCompleteNote = async () => {
    if (!showCompleteNoteModal) return;
    const mins = parseInt(noteTimeTaken, 10);
    if (isNaN(mins) || mins < 0) {
      toast.error('Please enter a valid time in minutes');
      return;
    }

    await study.completeSyllabusNote(uid, showCompleteNoteModal, mins);
    setShowCompleteNoteModal(null);
    toast.success('Note completed! Automatically moved to Completed Syllabus.');
  };

  // Delete Completed syllabus note
  const handleDeleteCompletedItem = async (itemId: string) => {
    if (confirm('Remove this note from completed syllabus logs?')) {
      await study.deleteCompletedSyllabusItem(uid, itemId);
      toast.success('Completed syllabus item deleted.');
    }
  };

  // CSV Export logic




  const getWeeklyChartData = () => {
    // Return last 4 weeks of study hours
    const data = [
      { name: 'Wk -3', hours: 0 },
      { name: 'Wk -2', hours: 0 },
      { name: 'Wk -1', hours: 0 },
      { name: 'This Wk', hours: 0 }
    ];

    const today = new Date();
    // Start tracking back 4 weeks
    for (let wk = 0; wk < 4; wk++) {
      let accumulatedSeconds = 0;
      for (let day = 0; day < 7; day++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (wk * 7 + day));
        const dateStr = targetDate.toLocaleDateString('en-CA');
        accumulatedSeconds += study.dailyTotals[dateStr] || 0;
      }
      data[3 - wk].hours = parseFloat((accumulatedSeconds / 3600).toFixed(1));
    }
    return data;
  };



  // Custom study heatmap renderer
  const renderHeatmap = () => {
    const weeksCount = 20; // 5 months
    const totalDays = weeksCount * 7;
    const dateList: { dateStr: string, seconds: number }[] = [];

    const today = new Date();
    const startDay = new Date();
    startDay.setDate(today.getDate() - totalDays + 1);
    
    // Adjust startDay to the nearest previous Sunday
    const startDayOfWeek = startDay.getDay(); 
    startDay.setDate(startDay.getDate() - startDayOfWeek);

    const checkDate = new Date(startDay);
    const renderLimit = totalDays + startDayOfWeek;

    for (let i = 0; i < renderLimit; i++) {
      const dStr = checkDate.toLocaleDateString('en-CA');
      dateList.push({
        dateStr: dStr,
        seconds: study.dailyTotals[dStr] || 0
      });
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Group dates by weeks
    const weeksData = [];
    for (let i = 0; i < dateList.length; i += 7) {
      weeksData.push(dateList.slice(i, i + 7));
    }

    const getCellColor = (seconds: number) => {
      if (seconds === 0) return 'bg-slate-900/60 border border-slate-800/20';
      const hours = seconds / 3600;
      if (hours < 1) return 'bg-primary/20 hover:bg-primary/30 border border-primary/10';
      if (hours < 3) return 'bg-primary/45 hover:bg-primary/55';
      if (hours < 5) return 'bg-primary/75 hover:bg-primary/85';
      return 'bg-primary border border-accent/20 scale-[1.05] shadow-sm shadow-primary/30';
    };

    const getFormattedDuration = (seconds: number) => {
      if (seconds === 0) return 'No study hours';
      const hrs = seconds / 3600;
      if (hrs < 1) return `${Math.round(seconds / 60)} mins studied`;
      return `${hrs.toFixed(1)} hrs studied`;
    };

    return (
      <div className="flex gap-[3px] overflow-x-auto pb-3 pt-1 scrollbar-thin select-none max-w-full">
        {weeksData.map((week, wkIdx) => (
          <div key={wkIdx} className="flex flex-col gap-[3px] shrink-0">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={`w-[12px] h-[12px] rounded-[3px] transition-all duration-200 cursor-help relative group ${getCellColor(day.seconds)}`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none bg-slate-950 border border-slate-800/80 rounded-lg p-2 text-[10px] text-white font-semibold whitespace-nowrap shadow-2xl">
                  {day.dateStr}
                  <div className="text-accent text-[9px] font-bold uppercase tracking-wider">{getFormattedDuration(day.seconds)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };



  // Syllabus Notes columns sorting
  const getNotesByStatus = (status: SyllabusNoteStatus) => {
    return study.syllabusNotes.filter(n => n.status === status);
  };

  const getPriorityBadgeColor = (p: SyllabusNotePriority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'low': return 'bg-slate-500/10 text-slate-500 border border-slate-800';
    }
  };

  // Completed Syllabus lists with live search & filters
  const getFilteredCompleted = () => {
    return study.completedSyllabus.filter(item => {
      const matchSearch = item.title.toLowerCase().includes(completedSearch.toLowerCase()) || 
                          item.subject.toLowerCase().includes(completedSearch.toLowerCase());
      
      const matchSubject = completedSubjectFilter === 'all' || 
                            item.subject.toLowerCase() === completedSubjectFilter.toLowerCase();
      
      const matchPriority = completedPriorityFilter === 'all' || 
                            item.priority === completedPriorityFilter;

      return matchSearch && matchSubject && matchPriority;
    });
  };

  // Extract unique subjects list
  const getUniqueCompletedSubjects = () => {
    const subjects = new Set<string>();
    study.completedSyllabus.forEach(item => subjects.add(item.subject));
    return Array.from(subjects);
  };

  // Formatted date string utility
  const formatDateTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };



  // Progress ring variables
  const radius = 64;
  const strokeDasharray = 2 * Math.PI * radius;
  const progressPercent = getProgressPercentage();
  const strokeDashoffset = strokeDasharray * (1 - progressPercent / 100);

  return (
    <div className="space-y-6 pb-24 text-dark-text-primary">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Study Mode
          </h1>
          <p className="text-dark-text-secondary text-sm">Track focus duration, streaks, syllabus coverage and deep analytics.</p>
        </div>

        {/* Sync Indicator & Mode Selector */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto bg-slate-900 p-1.5 rounded-2xl border border-slate-800/80">
          {study.isSyncingOffline && (
            <span className="text-[10px] text-accent font-bold animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Syncing...
            </span>
          )}

          <div className="flex space-x-1">
            {(['timer', 'notes', 'completed', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer capitalize ${
                  activeTab === tab 
                    ? 'bg-primary text-white shadow-md'
                    : 'text-dark-text-secondary hover:text-white'
                }`}
              >
                {tab === 'notes' ? 'Syllabus Notes' : tab === 'completed' ? 'Completed Syllabus' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      <AnimatePresence mode="wait">
        
        {/* TIMER TAB */}
        {/* TIMER TAB */}
        {activeTab === 'timer' && (
          <motion.div
            key="timer-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto"
          >
            {/* Primary Timer Card */}
            <div className="glass rounded-3xl p-8 border border-slate-855 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden">
              
              {/* Background ambient light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-full flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
                <span className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider">
                  Continuous Focus Timer
                </span>
                
                {/* Daily target indicator */}
                <button 
                  onClick={() => setShowGoalModal(true)}
                  className="text-xs text-accent font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Daily Goal: {Math.round(study.dailyGoal / 3600)} Hours
                </button>
              </div>

              {/* Progress Ring and Time Display */}
              <div className="relative w-56 h-56 my-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="rgba(148, 163, 184, 0.05)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="url(#timerGradient)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                  <defs>
                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-white leading-none font-mono tracking-tight">
                    {formatTimerString(study.secondsActive)}
                  </span>
                  
                  {/* Under timer badge */}
                  <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider mt-3">
                    {study.activeSession?.isRunning ? 'Keep focused' : study.activeSession ? 'Paused' : 'Ready'}
                  </span>
                  
                  {/* Expected goal complete */}
                  {study.activeSession?.isRunning && (
                    <span className="text-[9px] text-accent/80 font-semibold mt-1">
                      Target: {getExpectedCompletionTime()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-6 justify-center">
                {study.activeSession && (
                  <button
                    onClick={() => {
                      if (confirm('Discard this active segment? This cannot be undone.')) {
                        study.cancelTimer(uid);
                        toast('Timer discarded');
                      }
                    }}
                    className="py-3 px-6 bg-slate-950 hover:bg-slate-900 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                )}

                {study.activeSession && (
                  <button
                    onClick={handleStopClick}
                    className="flex-1 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop & Save</span>
                  </button>
                )}

                <button
                  onClick={study.activeSession?.isRunning ? handlePauseClick : handleStartTimerClick}
                  className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-primary/25"
                >
                  {study.activeSession?.isRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Focus</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Studying</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* SYLLABUS NOTES TAB */}
        {activeTab === 'notes' && (
          <motion.div
            key="notes-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Control bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white m-0">Syllabus Notes</h3>
                <p className="text-xs text-dark-text-secondary">Track subjects syllabus topics, priorities and completion flows.</p>
              </div>
              
              <button
                onClick={openNoteAddModal}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Syllabus Note</span>
              </button>
            </div>

            {/* Note Status Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Column 1: Not Started */}
              <div className="glass rounded-3xl p-5 border border-slate-850 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2 flex justify-between items-center">
                  <span>Not Started</span>
                  <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-lg text-dark-text-secondary font-mono">
                    {getNotesByStatus('Not Started').length}
                  </span>
                </h4>

                <div className="space-y-3">
                  {getNotesByStatus('Not Started').length === 0 ? (
                    <div className="text-center py-8 text-xs text-dark-text-secondary">No notes in this column.</div>
                  ) : (
                    getNotesByStatus('Not Started').map(note => (
                      <div key={note.id} className="bg-slate-950/60 hover:bg-slate-950 border border-slate-900 p-4 rounded-2xl space-y-2 group transition-colors duration-150">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] text-accent font-bold uppercase tracking-wide">{note.subject}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getPriorityBadgeColor(note.priority)}`}>
                            {note.priority}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white leading-snug">{note.title}</h5>
                        <p className="text-xs text-dark-text-secondary line-clamp-2">{note.description}</p>
                        
                        <div className="pt-2 flex justify-between items-center border-t border-slate-900/60">
                          <button
                            onClick={() => study.updateSyllabusNote(uid, note.id, { status: 'In Progress' })}
                            className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                          >
                            Move to In Progress
                          </button>
                          
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openNoteEditModal(note)} className="p-1 hover:bg-slate-800 rounded text-dark-text-secondary hover:text-white">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-slate-800 rounded text-dark-text-secondary hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div className="glass rounded-3xl p-5 border border-slate-850 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2 flex justify-between items-center">
                  <span>In Progress</span>
                  <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-lg text-dark-text-secondary font-mono">
                    {getNotesByStatus('In Progress').length}
                  </span>
                </h4>

                <div className="space-y-3">
                  {getNotesByStatus('In Progress').length === 0 ? (
                    <div className="text-center py-8 text-xs text-dark-text-secondary">No topics currently in progress.</div>
                  ) : (
                    getNotesByStatus('In Progress').map(note => (
                      <div key={note.id} className="bg-slate-950/60 hover:bg-slate-950 border border-slate-900 p-4 rounded-2xl space-y-2 group transition-colors duration-150">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] text-accent font-bold uppercase tracking-wide">{note.subject}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getPriorityBadgeColor(note.priority)}`}>
                            {note.priority}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white leading-snug">{note.title}</h5>
                        <p className="text-xs text-dark-text-secondary line-clamp-2">{note.description}</p>
                        
                        <div className="pt-2 flex justify-between items-center border-t border-slate-900/60">
                          <button
                            onClick={() => triggerCompleteNote(note.id)}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Complete</span>
                          </button>
                          
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openNoteEditModal(note)} className="p-1 hover:bg-slate-800 rounded text-dark-text-secondary hover:text-white">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-slate-800 rounded text-dark-text-secondary hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* COMPLETED SYLLABUS TAB */}
        {activeTab === 'completed' && (
          <motion.div
            key="completed-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Fullscreen navigator */}
            <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-2xl border border-slate-850/40">
              <div>
                <h4 className="text-sm font-bold text-white m-0">Mastered Topics History</h4>
                <p className="text-[10px] text-dark-text-secondary mt-0.5">Syllabus elements you have successfully cleared.</p>
              </div>
              <button
                onClick={() => navigate('/govexam/completed')}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-[11px] font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-accent" />
                <span>Open Dedicated Screen</span>
              </button>
            </div>

            {/* Search/Filters layout */}
            <div className="glass rounded-3xl p-5 border border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-dark-text-secondary absolute left-4 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                  placeholder="Search by topic or subject..."
                  className="w-full input-field pl-11 text-xs"
                />
              </div>

              {/* Subject Filter */}
              <div>
                <select
                  value={completedSubjectFilter}
                  onChange={(e) => setCompletedSubjectFilter(e.target.value)}
                  className="w-full input-field text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Subjects</option>
                  {getUniqueCompletedSubjects().map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={completedPriorityFilter}
                  onChange={(e) => setCompletedPriorityFilter(e.target.value)}
                  className="w-full input-field text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

            </div>

            {/* Completed logs listing */}
            <div className="glass rounded-3xl border border-slate-850 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-850 text-dark-text-secondary font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Completion Date</th>
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Topic Title</th>
                      <th className="py-4 px-6">Time Taken</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {getFilteredCompleted().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-dark-text-secondary">
                          No completed syllabus notes found matching filters.
                        </td>
                      </tr>
                    ) : (
                      getFilteredCompleted().map(item => (
                        <tr key={item.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-4 px-6 font-semibold text-white">
                            {formatDateTime(item.completedAt)}
                          </td>
                          <td className="py-4 px-6">
                            <span className="bg-primary/10 text-accent border border-primary/20 px-2.5 py-1 rounded-lg font-bold">
                              {item.subject}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white">{item.title}</div>
                            <div className="text-[10px] text-dark-text-secondary mt-0.5 line-clamp-1">{item.description}</div>
                          </td>
                          <td className="py-4 px-6 font-mono text-dark-text-secondary">
                            {item.timeTaken ? `${Math.floor(item.timeTaken / 60)}h ${item.timeTaken % 60}m` : '0m'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDeleteCompletedItem(item.id)}
                              className="p-2 hover:bg-slate-900 text-dark-text-secondary hover:text-red-400 rounded-lg cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Quick Aggregation stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Total Time Logged */}
              <div className="glass rounded-3xl p-5 border border-slate-850 text-left space-y-1">
                <div className="flex justify-between items-center text-dark-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Time Logged</span>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {Math.round(study.totalStudyTime / 3600)} hrs
                </div>
                <span className="text-[9px] text-dark-text-secondary">Cumulative study hours</span>
              </div>

              {/* Total Goal Maintained */}
              <div className="glass rounded-3xl p-5 border border-slate-850 text-left space-y-1">
                <div className="flex justify-between items-center text-dark-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Goal Maintained</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {Object.values(study.dailyTotals).filter(sec => sec >= study.dailyGoal).length} days
                </div>
                <span className="text-[9px] text-dark-text-secondary">Days daily study goal was met</span>
              </div>

              {/* Streaks Card */}
              <div className="glass rounded-3xl p-5 border border-slate-850 text-left space-y-1">
                <div className="flex justify-between items-center text-dark-text-secondary">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Current / Max Streak</span>
                  <Flame className="w-4 h-4 text-accent" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {study.currentStreak} / {study.longestStreak} days
                </div>
                <span className="text-[9px] text-dark-text-secondary">Consistent days of study</span>
              </div>

            </div>

            {/* Study Heatmap Grid */}
            <div className="glass rounded-3xl p-5 border border-slate-850 text-left space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">
                Study consistency (Last 5 Months)
              </h4>
              {renderHeatmap()}
              <div className="flex justify-between items-center text-[9px] text-dark-text-secondary font-medium px-1">
                <span>Less active</span>
                <div className="flex items-center gap-[3px]">
                  <div className="w-[10px] h-[10px] bg-slate-900 rounded-[2px]" />
                  <div className="w-[10px] h-[10px] bg-primary/20 rounded-[2px]" />
                  <div className="w-[10px] h-[10px] bg-primary/45 rounded-[2px]" />
                  <div className="w-[10px] h-[10px] bg-primary/75 rounded-[2px]" />
                  <div className="w-[10px] h-[10px] bg-primary rounded-[2px]" />
                </div>
                <span>More active</span>
              </div>
            </div>

            {/* Weekly Study Hours Chart Card (Full Width) */}
            <div className="glass rounded-3xl p-5 border border-slate-850 space-y-4">
              <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block text-left">
                Weekly study hours (Last 4 Weeks)
              </span>
              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getWeeklyChartData()}>
                    <defs>
                      <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.03)" />
                    <XAxis dataKey="name" stroke="#94A3B8" tickLine={false} />
                    <YAxis stroke="#94A3B8" tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0B1220', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="hours" stroke="#06B6D4" fillOpacity={1} fill="url(#weeklyGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>



          </motion.div>
        )}

      </AnimatePresence>

      {/* ======================================================== */}
      {/* OVERLAY MODALS */}
      {/* ======================================================== */}

      {/* FOCUS MODAL CHECKLIST (Pre-start check) */}
      <AnimatePresence>
        {showFocusChecklist && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 text-left"
            >
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Enable Focus Mode
                </h3>
                <p className="text-xs text-dark-text-secondary mt-1">
                  Please enable a focus constraint before starting your study timer.
                </p>
              </div>

              {/* Focus mode options select */}
              <div className="space-y-2">
                {[
                  { id: 'dnd', title: 'Do Not Disturb (Recommended)', desc: 'Block system notifications & popups' },
                  { id: 'focus', title: 'Focus Mode (Android Devices)', desc: 'Set native Wellbeing lock block' },
                  { id: 'airplane', title: 'Airplane Mode (Optional)', desc: 'Disconnect browser connection network' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setSelectedFocusMode(mode.id as any);
                      setDndConfirmed(false);
                      setAirplaneVerified(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedFocusMode === mode.id 
                        ? 'bg-primary/10 border-primary/45 text-white' 
                        : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-dark-text-secondary'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{mode.title}</div>
                    <div className="text-[10px] text-dark-text-secondary mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>

              {/* Instructions based on selected mode */}
              {selectedFocusMode && (
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl space-y-3">
                  <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider block">Instructions</span>
                  
                  {selectedFocusMode === 'dnd' && (
                    <div className="space-y-3">
                      <p className="text-xs text-dark-text-secondary leading-relaxed m-0">
                        Enable Do Not Disturb in your OS settings (Windows Focus Assist / macOS Focus / Android DND).
                      </p>
                      <label className="flex items-center space-x-2 text-xs font-semibold text-white select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dndConfirmed}
                          onChange={(e) => setDndConfirmed(e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                        />
                        <span>I confirm DND is active</span>
                      </label>
                    </div>
                  )}

                  {selectedFocusMode === 'focus' && (
                    <div className="space-y-3">
                      <p className="text-xs text-dark-text-secondary leading-relaxed m-0">
                        Configure Wellbeing Focus Mode on your Android or iOS device to lock distractive apps.
                      </p>
                      <label className="flex items-center space-x-2 text-xs font-semibold text-white select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dndConfirmed}
                          onChange={(e) => setDndConfirmed(e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                        />
                        <span>I confirm Focus Mode is active</span>
                      </label>
                    </div>
                  )}

                  {selectedFocusMode === 'airplane' && (
                    <div className="space-y-3">
                      <p className="text-xs text-dark-text-secondary leading-relaxed m-0">
                        Disconnect from Wifi/Cellular network. Airplane mode is validated by verifying offline state.
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={verifyAirplaneMode}
                          disabled={isAirplaneChecking}
                          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isAirplaneChecking ? 'Checking...' : 'Check Connection'}
                        </button>
                        
                        {airplaneVerified && (
                          <span className="text-[10px] text-emerald-400 font-bold self-center">Verified Offline!</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CTAs */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowFocusChecklist(false);
                    setSelectedFocusMode(null);
                  }}
                  className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFocusChecklistConfirm}
                  disabled={!selectedFocusMode || (selectedFocusMode !== 'airplane' && !dndConfirmed) || (selectedFocusMode === 'airplane' && !airplaneVerified)}
                  className="flex-1 py-3 bg-primary hover:bg-primary/95 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs cursor-pointer shadow-lg shadow-primary/25"
                >
                  Confirm & Start
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* DAILY GOAL MODAL */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card border border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4 text-left"
            >
              <h3 className="text-lg font-bold text-white">Set Daily Goal</h3>
              
              <form onSubmit={handleGoalSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Goal Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={customGoalHours}
                    onChange={(e) => setCustomGoalHours(e.target.value)}
                    className="w-full input-field text-sm"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 py-2.5 border border-slate-800 hover:bg-slate-900 rounded-2xl text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 rounded-2xl text-white text-xs font-bold cursor-pointer"
                  >
                    Apply Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SYLLABUS NOTE ADD/EDIT MODAL */}
      <AnimatePresence>
        {showNoteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left"
            >
              <h3 className="text-lg font-bold text-white">
                {editingNote ? 'Edit Syllabus Note' : 'Add Syllabus Note'}
              </h3>
              
              <form onSubmit={handleSaveNote} className="space-y-3 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Topic Title</label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Modern Indian History - Gandhi Era"
                    className="w-full input-field"
                    required
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Subject</label>
                  <input
                    type="text"
                    value={noteSubject}
                    onChange={(e) => setNoteSubject(e.target.value)}
                    placeholder="e.g. History"
                    className="w-full input-field"
                    required
                  />
                </div>

                {/* Priority / Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Priority</label>
                    <select
                      value={notePriority}
                      onChange={(e) => setNotePriority(e.target.value as any)}
                      className="w-full input-field cursor-pointer focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Status</label>
                    <select
                      value={noteStatus}
                      onChange={(e) => setNoteStatus(e.target.value as any)}
                      className="w-full input-field cursor-pointer focus:outline-none"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Description</label>
                  <textarea
                    value={noteDescription}
                    onChange={(e) => setNoteDescription(e.target.value)}
                    placeholder="Provide details about sub-topics, syllabus coverage, references..."
                    rows={3}
                    className="w-full input-field resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    className="flex-1 py-2.5 border border-slate-800 hover:bg-slate-900 rounded-2xl text-white font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 rounded-2xl text-white font-bold cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPLETE NOTE MODAL (Input time taken) */}
      <AnimatePresence>
        {showCompleteNoteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card border border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4 text-left"
            >
              <div>
                <h3 className="text-lg font-bold text-white">Complete Syllabus Topic</h3>
                <p className="text-[11px] text-dark-text-secondary mt-1">
                  How much time did you spend studying this topic overall?
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-dark-text-secondary uppercase">Time Taken (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={noteTimeTaken}
                  onChange={(e) => setNoteTimeTaken(e.target.value)}
                  className="w-full input-field text-sm"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCompleteNoteModal(null)}
                  className="flex-1 py-2.5 border border-slate-800 hover:bg-slate-900 rounded-2xl text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCompleteNote}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white text-xs font-bold cursor-pointer"
                >
                  Complete Topic
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default StudyTracker;
