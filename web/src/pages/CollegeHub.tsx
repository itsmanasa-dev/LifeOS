import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCollegeStore } from '../store/useCollegeStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { ocrService, type ProcessProgress } from '../services/ocrService';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { 
  CheckCircle, AlertTriangle, Image as ImageIcon, 
  Loader2, ChevronRight, Info 
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

  const [progress, setProgress] = useState<ProcessProgress | null>(null);

  useEffect(() => {
    if (uid) {
      college.loadTimetable(uid);
      attendance.loadAttendance(uid);
    }
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

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit. Please upload a smaller image or PDF.');
      return;
    }

    setIsExtracting(true);
    setProgress({ stage: 'Uploading', progress: 0, detail: 'Preparing file...' });
    toast.loading('Initializing timetable import...', { id: 'ocr' });

    try {
      let parsed;
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setProgress({ stage: 'Preprocessing', progress: 20, detail: 'Reading PDF pages...' });
        const text = await ocrService.extractTextFromPDF(file);
        
        setProgress({ stage: 'Parsing Timetable', progress: 70, detail: 'Extracting PDF timetable slots...' });
        parsed = ocrService.parseTimetableText(text);
      } else {
        // Image parsing using OpenCV + Tesseract.js Worker
        parsed = await ocrService.extractTimetableFromImage(file, (p) => {
          setProgress(p);
          toast.loading(`${p.stage}: ${p.detail || `${p.progress}%`}`, { id: 'ocr' });
        });
      }

      if (!parsed.slots || parsed.slots.length === 0) {
        throw new Error("We couldn't detect your timetable. Try uploading a clearer image or PDF.");
      }

      setProgress({ stage: 'Preparing Review', progress: 95, detail: 'Saving file reference...' });

      // Upload to Firebase Storage with timeout
      let downloadUrl = '';
      try {
        const storageRef = ref(storage, `users/${uid}/timetables/${Date.now()}_${file.name}`);
        const uploadPromise = uploadBytesResumable(storageRef, file);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Storage upload timed out')), 8000)
        );
        const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (uploadErr) {
        console.warn('Firebase Storage upload timed out or failed. Falling back to local Object URL.', uploadErr);
        downloadUrl = URL.createObjectURL(file);
      }

      toast.success('Timetable layout extracted successfully!', { id: 'ocr' });
      navigate('/college/import-preview', { 
        state: { 
          entries: parsed.slots,
          imageUrl: downloadUrl,
          semester: parsed.semester
        } 
      });
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message || "We couldn't detect your timetable. Try uploading a clearer image or PDF.", 
        { id: 'ocr' }
      );
    } finally {
      setIsExtracting(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getSlotStatus = (subjectName: string, type: 'Lecture' | 'Lab') => {
    const todayStr = new Date().toDateString();
    const record = attendance.records.find((r) => {
      const recordDateStr = new Date(r.date).toDateString();
      const sub = attendance.subjects.find((s) => s.id === r.subjectId);
      return (
        sub &&
        sub.name.toLowerCase() === subjectName.toLowerCase() &&
        recordDateStr === todayStr &&
        r.type === type
      );
    });

    if (record) {
      return record.status === 'present' ? 'Present' : 'Absent';
    }
    return 'Scheduled';
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

        {/* Local OCR Upload Panel Right Pane */}
        <div className="glass rounded-3xl p-6 border border-slate-800/50 md:col-span-2 flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-4 mb-4">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider">
              Timetable Importer
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isExtracting}
          />

          <div
            onClick={() => !isExtracting && fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-primary/50 bg-slate-900/30 hover:bg-slate-900/50 rounded-2xl py-8 px-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group min-h-[170px]"
          >
            {isExtracting ? (
              <div className="text-center space-y-3.5 w-full max-w-xs mx-auto">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <h4 className="text-sm font-bold text-white tracking-tight">{progress?.stage || 'Analyzing layout...'}</h4>
                {progress && (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300 ease-out" 
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-dark-text-secondary font-semibold">
                      {progress.detail || `${progress.progress}% completed`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2.5">
                <div className="p-3 bg-primary/10 rounded-full border border-primary/20 group-hover:scale-105 transition-transform duration-200 inline-block">
                  <ImageIcon className="w-7 h-7 text-primary" />
                </div>
                <h4 className="text-sm font-bold text-white">Upload Timetable Image / PDF</h4>
                <p className="text-xs text-dark-text-secondary max-w-xs leading-relaxed">
                  Upload an image or PDF of your schedule. Local OCR will extract and parse class slots automatically.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4 text-[10px] text-dark-text-secondary bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
            <Info className="w-4.5 h-4.5 text-accent shrink-0" />
            <p className="m-0 leading-relaxed font-medium">
              Files are stored securely in Firebase Storage. Text parsing runs entirely locally on your device.
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
                        Present: {sub.present} • Absent: {sub.absent} • Total: {sub.conducted}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-md font-extrabold ${
                        sub.percentage < sub.targetPercentage ? 'text-error' : 'text-success'
                      }`}
                    >
                      {sub.percentage.toFixed(0)}%
                    </span>
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
                        {/* Display Status */}
                        {(() => {
                          const status = getSlotStatus(c.subjectName, c.type);
                          return (
                            <span className={`text-[10px] font-bold block mt-1 ${
                              status === 'Present' ? 'text-success' : status === 'Absent' ? 'text-error' : 'text-accent'
                            }`}>
                              Status: {status}
                            </span>
                          );
                        })()}
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
    </div>
  );
};

export default CollegeHub;
