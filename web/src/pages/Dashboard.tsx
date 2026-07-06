import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCollegeStore } from '../store/useCollegeStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useStudyStore } from '../store/useStudyStore';
import { Flame, ArrowRight, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { user } = useAuthStore();
  const { loadTimetable } = useCollegeStore();
  const { getOverallStats, loadAttendance } = useAttendanceStore();
  const study = useStudyStore();

  const uid = user?.uid;

  useEffect(() => {
    if (uid) {
      loadTimetable(uid);
      loadAttendance(uid);
      study.loadStudyData(uid);
    }
  }, [uid, loadTimetable, loadAttendance]);

  const overallStats = getOverallStats();
  const isBelowTarget = overallStats.percentage < 75;

  const getWeeklyInsightData = () => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = labels.map(day => ({ name: day, score: 0 }));

    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; // 0 represents Sunday
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() - distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(mondayDate);
      targetDate.setDate(mondayDate.getDate() + i);
      const dateStr = targetDate.toLocaleDateString('en-CA');
      const seconds = study.dailyTotals[dateStr] || 0;
      data[i].score = parseFloat((seconds / 3600).toFixed(1));
    }
    return data;
  };

  const insightChartData = getWeeklyInsightData();
  const totalHoursThisWeek = insightChartData.reduce((sum, item) => sum + item.score, 0);
  const dailyGoalHours = parseFloat((study.dailyGoal / 3600).toFixed(1));
  const daysGoalMet = insightChartData.filter(d => d.score >= dailyGoalHours).length;



  const getFirstName = (fullName: string) => {
    if (!fullName) return 'User';
    return fullName.trim().split(/\s+/)[0];
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
        <div className="lg:col-span-2 flex flex-col justify-between">
          {/* Greeting & Weekly Insight Card merged */}
          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex-1 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2.5xl font-black text-white m-0">
                  Welcome, {getFirstName(user?.fullName || 'Alex')}!
                </h2>
                <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block mt-1">
                  Weekly Study Insight
                </span>
              </div>
              <div className="text-left sm:text-right">
                <h3 className="text-3.5xl font-black text-white m-0 font-mono">{totalHoursThisWeek.toFixed(1)} hrs</h3>
                <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider">Studied This Week</span>
              </div>
            </div>
            
            {/* Area Chart Sparkline */}
            <div className="h-32 w-full my-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insightChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
                  <YAxis hide />
                  <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-dark-text-secondary leading-relaxed m-0 font-medium">
              Daily study goal is <span className="text-white font-bold">{dailyGoalHours} hrs</span>. You met your goal on <span className="text-accent font-bold">{daysGoalMet} out of 7 days</span> this week.
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

      {/* Consistency Streak Card (Centered layout) */}
      <div className="max-w-md mx-auto">
        <div className="glass rounded-3xl p-6 border border-slate-850 flex flex-col justify-between items-center text-center shadow-xl">
          <div className="w-full flex justify-between items-center border-b border-slate-800/50 pb-3 mb-3">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Consistency Streak
            </span>
            <Flame className="w-4.5 h-4.5 text-accent animate-pulse" />
          </div>

          <div className="space-y-3 my-2">
            <div className="relative inline-block p-4 bg-primary/10 rounded-full border border-primary/20">
              <Flame className="w-10 h-10 text-accent fill-accent" />
            </div>
            <h3 className="text-4xl font-extrabold text-white tracking-tight leading-none">
              {study.currentStreak} Days
            </h3>
            <p className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Record Streak: {study.longestStreak} days
            </p>
          </div>

          <div className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-900 text-left space-y-1 mt-2">
            <span className="text-[9px] text-dark-text-secondary font-bold uppercase tracking-wider block">Streak Info</span>
            <p className="text-[11px] text-dark-text-secondary leading-relaxed m-0 font-medium">
              Study for at least <span className="text-white font-bold">{Math.round(study.dailyGoal / 3600)} hours</span> today to maintain your consistency streak.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
