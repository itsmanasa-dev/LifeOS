import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCollegeStore } from '../store/useCollegeStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { geminiService } from '../services/geminiService';
import { 
  CheckCircle, AlertTriangle, Image as ImageIcon, 
  Settings, Loader2, ChevronRight, Info 
} from 'lucide-react';
import toast from 'react-hot-toast';

const CollegeHub: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuthStore();
  const college = useCollegeStore();
  const attendance = useAttendanceStore();
  const uid = user?.uid || '';

  const [isExtracting, setIsExtracting] = useState(false);
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (uid) {
      college.loadTimetable(uid);
      attendance.loadAttendance(uid);
    }
    setApiKeyInput(geminiService.getApiKey());
  }, [uid]);

  const todayClasses = college.getTodayEntries();
  const overallStats = attendance.getOverallStats();
  const subjectsWithStats = attendance.getSubjectsWithStats();

  const handleLogQuickAttendance = async (subjectName: string, isPresent: boolean, type: 'Lecture' | 'Lab') => {
    try {
      const todayStr = new Date().toISOString();
      await attendance.logAttendance(uid, subjectName, isPresent, todayStr, type);
      toast.success(`Logged ${isPresent ? 'Present' : 'Absent'} for ${subjectName}`);
    } catch (err) {
      toast.error('Failed to log attendance.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = geminiService.getApiKey();
    if (!apiKey) {
      toast.error('Gemini API key is required. Please configure it first.');
      setApiKeyModal(true);
      return;
    }

    setIsExtracting(true);
    toast.loading('Analyzing layout with Gemini AI...', { id: 'ocr' });

    try {
      const parsedEntries = await geminiService.extractTimetable(file);
      toast.success('Timetable layout extracted successfully!', { id: 'ocr' });
      // Navigate to preview page passing parsedEntries through state
      navigate('/college/import-preview', { state: { entries: parsedEntries } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'AI Vision extraction failed.', { id: 'ocr' });
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveApiKey = () => {
    if (!apiKeyInput.trim()) {
      toast.error('API key cannot be empty');
      return;
    }
    geminiService.saveApiKey(apiKeyInput.trim());
    toast.success('Gemini API key saved!');
    setApiKeyModal(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">College Hub</h1>
          <p className="text-dark-text-secondary text-sm">Manage class schedules and track attendance logs.</p>
        </div>
      </div>

      {/* Grid Dashboard Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Overall Attendance Left Pane */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Overall Attendance
            </span>
            {overallStats.percentage < 75 ? (
              <AlertTriangle className="w-5 h-5 text-error" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
          </div>

          <div className="flex items-center space-x-6 my-2">
            {/* SVG Ring */}
            <div className="relative w-24 h-24 shrink-0">
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
                  stroke={overallStats.percentage < 75 ? '#EF4444' : '#22C55E'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - overallStats.percentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-white">
                  {overallStats.percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-left flex-1">
              <div className="text-xs text-dark-text-secondary">
                <span className="font-bold text-white mr-1">{overallStats.attended}</span> Attended
              </div>
              <div className="text-xs text-dark-text-secondary">
                <span className="font-bold text-white mr-1">{overallStats.absent}</span> Absent
              </div>
              <div className="text-xs text-dark-text-secondary">
                <span className="font-bold text-white mr-1">{overallStats.total}</span> Conducted
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/50 grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Theory</span>
              <span className="text-md font-extrabold text-cyan-400">{overallStats.theory}</span>
            </div>
            <div className="border-l border-slate-800/50">
              <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Labs</span>
              <span className="text-md font-extrabold text-amber-500">{overallStats.labs}</span>
            </div>
          </div>
        </div>

        {/* OCR Upload Panel Right Pane */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 md:col-span-2 flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              AI Timetable Importer
            </span>
            <button
              onClick={() => setApiKeyModal(true)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-primary hover:text-accent cursor-pointer"
              title="Configure API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isExtracting}
          />

          <div
            onClick={() => !isExtracting && fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-primary/50 bg-slate-900/30 hover:bg-slate-900/50 rounded-2xl py-8 px-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group"
          >
            {isExtracting ? (
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <h4 className="text-sm font-bold text-white">Analyzing layout...</h4>
                <p className="text-xs text-dark-text-secondary">AI is reading schedule blocks.</p>
              </div>
            ) : (
              <div className="text-center space-y-2.5">
                <div className="p-3 bg-primary/10 rounded-full border border-primary/20 group-hover:scale-105 transition-transform duration-200 inline-block">
                  <ImageIcon className="w-7 h-7 text-primary" />
                </div>
                <h4 className="text-sm font-bold text-white">Upload Timetable Image</h4>
                <p className="text-xs text-dark-text-secondary max-w-xs leading-relaxed">
                  Upload an image of your schedule. Gemini AI will structure and group classes automatically.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4 text-[10px] text-dark-text-secondary bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
            <Info className="w-4.5 h-4.5 text-accent shrink-0" />
            <p className="m-0 leading-relaxed font-medium">
              We preprocess the image internally (Grayscale, Contrast enhancement, Denoising) to ensure optimal reading accuracy.
            </p>
          </div>
        </div>

      </div>

      {/* Grid for Bottom Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Subjects Overview */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white m-0">Subjects Overview</h3>
          <div className="space-y-3">
            {subjectsWithStats.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-dark-text-secondary border border-slate-800/50">
                <p className="m-0">No subjects currently tracked. Import a timetable layout to start.</p>
              </div>
            ) : (
              subjectsWithStats.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/college/subject/${sub.id}`)}
                  className="glass rounded-2xl p-4 border border-slate-800/50 hover:border-slate-700/60 cursor-pointer transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
                      style={{ backgroundColor: `${sub.color}15`, color: sub.color }}
                    >
                      {getInitials(sub.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">{sub.name}</h4>
                      <span className="text-xs text-dark-text-secondary mt-0.5 block">
                        Present: {sub.attendedCount} • Absent: {sub.totalCount - sub.attendedCount} • Total: {sub.totalCount}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {(() => {
                      const pct = sub.totalCount === 0 ? 100 : (sub.attendedCount / sub.totalCount) * 100;
                      return (
                        <span
                          className={`text-md font-extrabold ${
                            pct < sub.targetPercentage ? 'text-error' : 'text-success'
                          }`}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      );
                    })()}
                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors duration-200" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Classes check-in */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white m-0">Today's Schedule</h3>
          <div className="space-y-3">
            {todayClasses.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-dark-text-secondary border border-slate-800/50">
                <p className="m-0">No classes scheduled for today! 🎉</p>
              </div>
            ) : (
              todayClasses.map((c) => (
                <div
                  key={c.id}
                  className="glass rounded-2xl p-4 border border-slate-800/50 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-1 h-8 rounded-full" style={{ backgroundColor: c.subjectColor }} />
                      <div>
                        <h4 className="text-sm font-bold text-white truncate max-w-40">{c.subjectName}</h4>
                        <span className="text-[10px] text-dark-text-secondary block mt-0.5 font-bold uppercase tracking-wider">
                          {c.startTime} - {c.endTime} {c.room && `| Room ${c.room}`}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        c.type === 'Lab' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {c.type}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleLogQuickAttendance(c.subjectName, true, c.type)}
                      className="flex-1 py-2 bg-success/10 hover:bg-success/20 text-success text-xs font-bold rounded-xl border border-success/25 transition-all duration-200 cursor-pointer"
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleLogQuickAttendance(c.subjectName, false, c.type)}
                      className="flex-1 py-2 bg-error/10 hover:bg-error/20 text-error text-xs font-bold rounded-xl border border-error/25 transition-all duration-200 cursor-pointer"
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Configure Gemini Key</h3>
            <p className="text-xs text-dark-text-secondary mb-4 leading-relaxed">
              To understand your timetable image structure, this app uses Google Gemini Flash AI on the client. Please enter your API Key below:
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full input-field text-sm font-mono"
              />
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setApiKeyModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveApiKey}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-primary/20"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeHub;
