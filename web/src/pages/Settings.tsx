import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { geminiService } from '../services/geminiService';
import { userService } from '../services/userService';
import { 
  LogOut, Cloud, Key, Check 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const planner = usePlannerStore();
  const attendance = useAttendanceStore();
  const uid = user?.uid || '';

  const [cloudSync, setCloudSync] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [collegeName, setCollegeName] = useState(user?.college || 'LifeOS University');
  const [editCollege, setEditCollege] = useState(false);

  // Load stats
  useEffect(() => {
    if (uid) {
      planner.loadTasks(uid);
      attendance.loadAttendance(uid);
    }
    setApiKey(geminiService.getApiKey());
  }, [uid]);

  const completedCount = 1280 + planner.tasks.filter((t) => t.isCompleted).length;
  const attendanceAvg = attendance.getOverallStats().percentage;

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out.');
    }
  };

  const handleToggleSync = (checked: boolean) => {
    setCloudSync(checked);
    toast.success(checked ? 'Cloud sync enabled' : 'Cloud sync paused. Using cached local storage.');
  };

  const handleSaveApiKey = () => {
    geminiService.saveApiKey(apiKey.trim());
    toast.success('Gemini API Key updated!');
  };

  const handleUpdateCollege = async () => {
    if (!uid || !user) return;
    try {
      const updatedUser = { ...user, college: collegeName.trim() };
      await userService.saveUser(updatedUser);
      // Wait, let's update local auth state user
      useAuthStore.setState({ user: updatedUser });
      toast.success('College name updated!');
      setEditCollege(false);
    } catch (err) {
      toast.error('Failed to save profile changes');
    }
  };

  const achievements = [
    { name: '30 Day Streak', emoji: '🔥', unlocked: true },
    { name: 'Early Bird', emoji: '🌅', unlocked: true },
    { name: 'Focus Star', emoji: '✨', unlocked: true },
    { name: 'Elite Badge', emoji: '🛡️', unlocked: false },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
        <p className="text-dark-text-secondary text-sm">Manage user profile settings, credentials, and offline synchronization.</p>
      </div>

      {/* Profile Card */}
      <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col items-center text-center shadow-lg relative">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-2xl font-black text-primary">
            {getInitials(user?.fullName || 'Alex Chen')}
          </div>
          <div className="absolute bottom-0 right-0 p-1.5 bg-success border-2 border-dark-bg rounded-full" />
        </div>

        <h2 className="text-xl font-extrabold text-white mb-0.5">{user?.fullName}</h2>
        <span className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider block mb-3">
          Productivity Architect • Tier 3
        </span>

        {/* Editable College Label */}
        {editCollege ? (
          <div className="flex items-center space-x-2 w-full max-w-xs mt-1">
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="flex-1 input-field py-1.5 px-3 text-xs"
              required
            />
            <button
              onClick={handleUpdateCollege}
              className="p-2 bg-success/20 border border-success/30 text-success rounded-xl cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditCollege(true)}
            className="text-xs text-dark-text-secondary hover:text-white transition-colors underline cursor-pointer"
          >
            {user?.college || 'LifeOS University'}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-3xl p-5 border border-slate-800/50 text-center">
          <span className="text-2.5xl font-black text-primary">{completedCount}</span>
          <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block mt-1.5">
            Tasks Completed
          </span>
        </div>
        <div className="glass rounded-3xl p-5 border border-slate-800/50 text-center">
          <span className="text-2.5xl font-black text-accent">{attendanceAvg.toFixed(0)}%</span>
          <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block mt-1.5">
            Attendance Average
          </span>
        </div>
      </div>

      {/* Achievements row */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white m-0">Achievements</h3>
        <div className="grid grid-cols-4 gap-3">
          {achievements.map((item) => (
            <div
              key={item.name}
              className={`glass rounded-2xl p-4 border border-slate-800/50 flex flex-col items-center justify-center text-center transition-all ${
                item.unlocked ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className="text-2xl mb-1.5 block">{item.emoji}</span>
              <span className="text-[9px] text-white font-extrabold uppercase tracking-wider leading-none">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Settings List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white m-0">System Config</h3>
        <div className="glass rounded-3xl p-4 border border-slate-800/50 space-y-5">
          {/* Cloud Sync toggle */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3.5">
              <Cloud className="w-5 h-5 text-dark-text-secondary" />
              <div>
                <h4 className="text-sm font-bold text-white">Database Sync</h4>
                <p className="text-[10px] text-dark-text-secondary leading-none mt-0.5">Persist workspace logs online.</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={cloudSync}
              onChange={(e) => handleToggleSync(e.target.checked)}
              className="w-9 h-5 bg-slate-900 border border-slate-850 rounded-full appearance-none checked:bg-primary relative before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform duration-200 cursor-pointer"
            />
          </div>

          <hr className="border-slate-800/40 m-0" />

          {/* Gemini API Key config */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3.5">
              <Key className="w-5 h-5 text-dark-text-secondary" />
              <div>
                <h4 className="text-sm font-bold text-white">Gemini Vision Key</h4>
                <p className="text-[10px] text-dark-text-secondary leading-none mt-0.5">Required for AI timetable import OCR.</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 input-field text-xs font-mono py-2"
              />
              <button
                onClick={handleSaveApiKey}
                className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          <hr className="border-slate-800/40 m-0" />

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-error/10 hover:bg-error/15 text-error border border-error/20 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
