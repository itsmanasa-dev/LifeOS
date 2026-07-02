import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCollegeStore } from '../store/useCollegeStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { usePlannerStore } from '../store/usePlannerStore';
import { Flame, ArrowRight, CheckCircle2, Circle, AlertTriangle, Calendar, Clock, MapPin, Compass } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

const insightData = [
  { name: 'Mon', score: 60 },
  { name: 'Tue', score: 72 },
  { name: 'Wed', score: 68 },
  { name: 'Thu', score: 85 },
  { name: 'Fri', score: 80 },
  { name: 'Sat', score: 92 },
  { name: 'Sun', score: 84 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { user } = useAuthStore();
  const { getTodayEntries, loadTimetable } = useCollegeStore();
  const { getOverallStats, loadAttendance } = useAttendanceStore();
  const { tasks, loadTasks, toggleComplete, isLoadingTasks: tasksLoading } = usePlannerStore();

  const uid = user?.uid;

  useEffect(() => {
    if (uid) {
      loadTimetable(uid);
      loadAttendance(uid);
      loadTasks(uid);
    }
  }, [uid, loadTimetable, loadAttendance, loadTasks]);

  const todayEntries = getTodayEntries();
  const overallStats = getOverallStats();
  const isBelowTarget = overallStats.percentage < 75;

  // Get top 3 priority tasks (uncompleted, sorted by due date)
  const priorityTasks = tasks
    .filter((t) => !t.isCompleted)
    .slice(0, 3);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-error';
      case 'medium':
        return 'bg-warning';
      default:
        return 'bg-success';
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!uid) return;
    try {
      await toggleComplete(uid, taskId);
      toast.success('Task status updated!');
    } catch (err) {
      toast.error('Failed to update task.');
    }
  };

  const getFirstName = (fullName: string) => {
    if (!fullName) return 'User';
    return fullName.trim().split(/\s+/)[0];
  };

  const formatTime = (timeStr: string) => {
    // Converts "09:00" to "09:00 AM" (or similar standard layout)
    try {
      const [hourStr, minStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minStr} ${suffix}`;
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Upper header */}
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider block mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none m-0">
            LifeOS Workspace
          </h1>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="p-3 bg-dark-card hover:bg-slate-800 rounded-2xl border border-slate-800/80 transition-all duration-200 cursor-pointer"
        >
          <Compass className="w-5 h-5 text-dark-text-secondary hover:text-white" />
        </button>
      </div>

      {/* Grid Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Welcomer & Insights */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* Greeting Card */}
          <div className="glass rounded-3xl p-7 border border-slate-800/50 flex items-center justify-between relative overflow-hidden bg-workspace-gradient shadow-xl shadow-primary/5">
            <div className="space-y-2 z-10">
              <h2 className="text-2.5xl font-black text-white m-0">
                Welcome, {getFirstName(user?.fullName || 'Alex')}!
              </h2>
              <p className="text-slate-150 text-sm max-w-sm font-medium">
                Your schedule looks manageable today. Let's finish those tasks to maintain your streak!
              </p>
              <div className="inline-flex items-center space-x-2 bg-black/20 text-accent text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-accent" />
                <span>Level 3 Productivity</span>
              </div>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
              <Flame className="w-48 h-48 text-white" />
            </div>
          </div>

          {/* Weekly Insight Sparkline */}
          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block mb-1">
                Weekly Insight
              </span>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-3xl font-black text-white m-0">84%</h3>
                <span className="text-xs text-dark-text-secondary font-semibold">Productivity Score</span>
              </div>
            </div>
            
            {/* Area Chart Sparkline */}
            <div className="h-28 w-full my-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insightData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: '#1B2433', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#F8FAFC', fontSize: '13px' }}
                  />
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[50, 100]} hide />
                  <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-dark-text-secondary leading-relaxed m-0 font-medium">
              You're performing <span className="text-success font-bold">12% better</span> than last week. Focus blocks are being utilized effectively.
            </p>
          </div>
        </div>

        {/* Right Column: Semester Attendance Percentage */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between items-center text-center shadow-lg">
          <div className="w-full flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Semester Attendance
            </span>
            {isBelowTarget ? (
              <AlertTriangle className="w-4.5 h-4.5 text-error" />
            ) : (
              <CheckCircle2 className="w-4.5 h-4.5 text-success" />
            )}
          </div>

          {/* SVG Progress Circle */}
          <div className="relative w-36 h-36 my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(148, 163, 184, 0.1)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={isBelowTarget ? '#EF4444' : '#22C55E'}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - overallStats.percentage / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2.5xl font-black text-white leading-none">
                {overallStats.percentage.toFixed(0)}%
              </span>
              <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider mt-1">
                Conducted
              </span>
            </div>
          </div>

          <div className="space-y-4 w-full">
            <p className="text-xs text-dark-text-secondary leading-relaxed px-2 font-medium">
              {isBelowTarget
                ? 'Attendance is below your 75% target. Attendance is critical!'
                : 'On track! Keep attending classes to maintain your target.'}
            </p>
            {/* Stats Overview Pill */}
            <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/40">
              <div className="text-left">
                <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider block">Present</span>
                <span className="text-sm font-extrabold text-success">{overallStats.attended}</span>
              </div>
              <div className="text-left border-l border-slate-800/50 pl-2">
                <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider block">Absent</span>
                <span className="text-sm font-extrabold text-error">{overallStats.absent}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Focus Timer CTA Banner */}
      <div
        onClick={() => navigate('/govexam')}
        className="w-full bg-workspace bg-slate-900/60 hover:bg-slate-900/80 rounded-3xl p-5 border border-slate-800/80 cursor-pointer transition-all duration-300 flex items-center justify-between shadow-lg shadow-black/10 group"
      >
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 group-hover:scale-105 transition-transform duration-200">
            <Flame className="w-6 h-6 text-accent fill-accent" />
          </div>
          <div>
            <h4 className="text-md font-bold text-white mb-0.5">Start Focus Session</h4>
            <span className="text-xs text-dark-text-secondary font-medium">Deep work block for 45 minutes</span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-dark-text-secondary group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
      </div>

      {/* Grid for Bottom Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Today's Classes chronological list */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white m-0">What's Next</h3>
            <button
              onClick={() => navigate('/college')}
              className="text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              View Calendar
            </button>
          </div>

          <div className="space-y-3">
            {todayEntries.length === 0 ? (
              <div className="glass rounded-2xl p-6 border border-slate-800/50 text-center">
                <p className="text-sm text-dark-text-secondary m-0">No upcoming classes today! 🎉</p>
              </div>
            ) : (
              todayEntries.slice(0, 2).map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => navigate(`/college/subject/${entry.id}`)}
                  className="glass rounded-2xl p-4 border border-slate-800/50 hover:border-slate-700/60 cursor-pointer flex items-center justify-between transition-all duration-200"
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className="p-2.5 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${entry.subjectColor}15` }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: entry.subjectColor }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{entry.subjectName}</h4>
                      <div className="flex items-center space-x-2 text-xs text-dark-text-secondary">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</span>
                        {entry.room && (
                          <>
                            <span>|</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{entry.room}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Tasks List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white m-0">Priority Tasks</h3>
            <button
              onClick={() => navigate('/planner')}
              className="text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {tasksLoading ? (
              <div className="glass rounded-2xl p-6 border border-slate-800/50 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-dark-text-secondary" />
              </div>
            ) : priorityTasks.length === 0 ? (
              <div className="glass rounded-2xl p-6 border border-slate-800/50 text-center">
                <p className="text-sm text-dark-text-secondary m-0">No pending tasks. Tap View All to add.</p>
              </div>
            ) : (
              priorityTasks.map((task) => (
                <div
                  key={task.id}
                  className="glass rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between hover:border-slate-700/60 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="text-dark-text-secondary hover:text-white cursor-pointer focus:outline-none shrink-0"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-sm font-bold truncate mb-0.5 ${
                          task.isCompleted ? 'line-through text-dark-text-secondary font-medium' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.dueDate && (
                        <span className="text-xs text-dark-text-secondary flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Due: {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Priority Dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getPriorityColor(task.priority)}`} />
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Simple loader helper
const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default Dashboard;
