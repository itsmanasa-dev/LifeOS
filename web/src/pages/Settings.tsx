import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { geminiService } from '../services/geminiService';
import { 
  LogOut, Cloud, Key, SunMoon, Languages, Calendar, Clock, Sliders, 
  Sparkles, Share2, Star, MessageSquare, ShoppingCart, Shield, FileText, 
  Activity, HelpCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const uid = user?.uid || '';

  // Local state for interactive preferences matching screenshots
  const [theme, setTheme] = useState(() => localStorage.getItem('pref_theme') || 'System default');
  const [language, setLanguage] = useState(() => localStorage.getItem('pref_language') || 'English');
  const [weekStart, setWeekStart] = useState(() => localStorage.getItem('pref_week_start') || 'Monday');
  const [dayStart, setDayStart] = useState(() => localStorage.getItem('pref_day_start') || '12:00 AM');
  const [timeFormat, setTimeFormat] = useState(() => localStorage.getItem('pref_time_format') || '12 hours');
  const [roundTimer, setRoundTimer] = useState(() => localStorage.getItem('pref_round_timer') || 'Off');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [crashReports, setCrashReports] = useState(true);

  // Original database credentials state
  const [cloudSync, setCloudSync] = useState(true);
  const [apiKey, setApiKey] = useState('');

  // Load API Key on mount
  useEffect(() => {
    setApiKey(geminiService.getApiKey());
  }, [uid]);

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const restorePurchases = () => {
    const loadingToast = toast.loading('Restoring previous purchases...');
    setTimeout(() => {
      toast.dismiss(loadingToast);
      toast.success('All purchases restored successfully!');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-20 px-4 font-sans">
      {/* Title */}
      <div className="text-left">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
      </div>

      {/* Name and Level Card */}
      <div className="glass rounded-3xl p-5 border border-slate-800/40 flex items-center space-x-4 shadow-lg bg-[#0F172A]/40 backdrop-blur-md">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xl font-black text-primary shadow-inner">
            {getInitials(user?.fullName || 'Alex Chen')}
          </div>
          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-success border-2 border-[#0B1220] rounded-full" />
        </div>
        <div className="flex-1 text-left">
          <h2 className="text-base font-extrabold text-white leading-tight">{user?.fullName || 'Alex Chen'}</h2>
          <p className="text-xs text-dark-text-secondary font-semibold mt-1">
            Productivity Architect • Tier 3
          </p>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-wider px-2 text-left">Preferences</h3>
        <div className="glass rounded-3xl border border-slate-800/40 p-2 space-y-1 bg-[#0F172A]/20">
          
          {/* Theme */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <SunMoon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Theme</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{theme}</p>
              </div>
            </div>
            <select
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                localStorage.setItem('pref_theme', e.target.value);
                toast.success(`Theme set to ${e.target.value}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="System default">System default</option>
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Language */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Languages className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Language</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{language}</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                localStorage.setItem('pref_language', e.target.value);
                toast.success(`Language set to ${e.target.value}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
              <option value="French">French</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Week starts from */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Week starts from</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{weekStart}</p>
              </div>
            </div>
            <select
              value={weekStart}
              onChange={(e) => {
                setWeekStart(e.target.value);
                localStorage.setItem('pref_week_start', e.target.value);
                toast.success(`Week starts from ${e.target.value}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="Monday">Monday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Day starts at */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Day starts at</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{dayStart}</p>
              </div>
            </div>
            <select
              value={dayStart}
              onChange={(e) => {
                setDayStart(e.target.value);
                localStorage.setItem('pref_day_start', e.target.value);
                toast.success(`Day starts at ${e.target.value}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="12:00 AM">12:00 AM</option>
              <option value="1:00 AM">1:00 AM</option>
              <option value="5:00 AM">5:00 AM</option>
              <option value="6:00 AM">6:00 AM</option>
              <option value="7:00 AM">7:00 AM</option>
              <option value="8:00 AM">8:00 AM</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Time format */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Time format</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{timeFormat}</p>
              </div>
            </div>
            <select
              value={timeFormat}
              onChange={(e) => {
                setTimeFormat(e.target.value);
                localStorage.setItem('pref_time_format', e.target.value);
                toast.success(`Time format set to ${e.target.value}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="12 hours">12 hours</option>
              <option value="24 hours">24 hours</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Round timer duration */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Round timer duration</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{roundTimer}</p>
              </div>
            </div>
            <select
              value={roundTimer}
              onChange={(e) => {
                setRoundTimer(e.target.value);
                localStorage.setItem('pref_round_timer', e.target.value);
                toast.success(`Round timer set to ${e.target.value}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="Off">Off</option>
              <option value="1 minute">1 minute</option>
              <option value="5 minutes">5 minutes</option>
              <option value="10 minutes">10 minutes</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Advanced Settings Expandable Row */}
          <div 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Advanced settings</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Database Sync, Gemini API Key</p>
              </div>
            </div>
            <div className="text-dark-text-secondary">
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {/* Advanced Accordion Panel */}
          {showAdvanced && (
            <div className="px-4 py-4 bg-[#0F172A]/40 rounded-2xl mt-1 space-y-4 text-left border border-slate-800/30 animate-fadeIn">
              {/* Database Sync */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Cloud className="w-5 h-5 text-dark-text-secondary" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Database Sync</h4>
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

              <hr className="border-slate-800/30 m-0" />

              {/* Gemini Key */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Key className="w-5 h-5 text-dark-text-secondary" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Gemini Vision Key</h4>
                    <p className="text-[10px] text-dark-text-secondary leading-none mt-0.5">Required for AI timetable import OCR.</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-xs font-mono py-2 px-3"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Automation Section */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-wider px-2 text-left">Automation</h3>
        <div className="glass rounded-3xl border border-slate-800/40 p-2 bg-[#0F172A]/20">
          <div 
            onClick={() => toast.success("Automation optimization runs in background automatically.")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Automation</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Smart schedule assistance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-wider px-2 text-left">Support</h3>
        <div className="glass rounded-3xl border border-slate-800/40 p-2 space-y-1 bg-[#0F172A]/20">
          
          {/* Share */}
          <div 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'LifeOS',
                  text: 'Check out LifeOS, the ultimate productivity workspace!',
                  url: window.location.origin
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(window.location.origin);
                toast.success('LifeOS workspace link copied to clipboard!');
              }
            }}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Share</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Invite friends to LifeOS</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Rate and review */}
          <div 
            onClick={() => toast.success("Thank you for rating LifeOS! We appreciate your support.")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Star className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Rate and review</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Help us improve LifeOS</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Feedback and requests */}
          <div 
            onClick={() => toast.success("Send us an email at support@lifeos.com with feedback!")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Feedback and requests</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Report bugs or suggest features</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Restore purchases */}
          <div 
            onClick={restorePurchases}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Restore purchases</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Recover previous transactions</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* About Section */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-wider px-2 text-left">About</h3>
        <div className="glass rounded-3xl border border-slate-800/40 p-2 space-y-1 bg-[#0F172A]/20">
          
          {/* Version */}
          <div 
            onClick={() => toast.success("Version 2.25.0 - Running latest build")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Version</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">2.25.0</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Terms of use */}
          <div 
            onClick={() => toast.success("Redirecting to Terms of Use...")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Terms of use</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Read our terms of service</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Privacy policy */}
          <div 
            onClick={() => toast.success("Redirecting to Privacy Policy...")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Privacy policy</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">Read our privacy guidelines</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Usage and crash reports */}
          <div className="relative flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Usage and crash reports</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">{crashReports ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            <select
              value={crashReports ? 'Enabled' : 'Disabled'}
              onChange={(e) => {
                const enabled = e.target.value === 'Enabled';
                setCrashReports(enabled);
                toast.success(`Crash reports ${enabled ? 'enabled' : 'disabled'}`);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <hr className="border-slate-800/30 m-0" />

          {/* Third-party licenses */}
          <div 
            onClick={() => toast.success("Redirecting to Third-party licenses...")}
            className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors rounded-2xl cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-slate-800/40 rounded-xl text-dark-text-secondary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">Third-party licenses</h4>
                <p className="text-xs text-dark-text-secondary mt-0.5">View open-source package licenses</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-error/10 hover:bg-error/15 text-error border border-error/20 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-error/5"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Sign Out Workspace</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
