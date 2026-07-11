import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCollegeStore } from '../store/useCollegeStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { 
  Plus, Trash2, AlertTriangle, ArrowLeft, 
  Copy, Undo2, Calendar, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getColorForSubject, ocrService } from '../services/ocrService';
import type { TimetableEntry } from '../types';

const TimetablePreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuthStore();
  const college = useCollegeStore();
  const attendance = useAttendanceStore();
  const uid = user?.uid || '';

  // Retrieve initial entries passed from OCR uploader
  const initialEntries = (location.state as any)?.entries as TimetableEntry[] || [];
  const imageUrl = (location.state as any)?.imageUrl || '';
  const initialSemester = (location.state as any)?.semester || 'Semester 1';

  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [semester, setSemester] = useState<string>(initialSemester);
  const [confirmModal, setConfirmModal] = useState(false);
  
  // History state for undo functionality
  const [history, setHistory] = useState<TimetableEntry[][]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const types = ['Lecture', 'Lab'];

  const pushToHistory = (currentEntries: TimetableEntry[]) => {
    setHistory((prev) => [...prev, [...currentEntries.map(e => ({ ...e }))]]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setEntries(previousState);
    setHistory((prev) => prev.slice(0, -1));
    toast.success('Undone last change');
  };

  const handleAddSlot = () => {
    pushToHistory(entries);
    const newSlot: TimetableEntry = {
      id: `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subjectName: 'New Subject',
      subjectColor: '#6366F1',
      startTime: '09:00',
      endTime: '09:50',
      room: 'L-101',
      teacher: '',
      dayOfWeek: 1,
      day: 'Monday',
      type: 'Lecture',
      confidence: 100,
      lowConfidenceFields: [],
    };
    setEntries([...entries, newSlot]);
  };

  const handleDeleteSlot = (id: string) => {
    pushToHistory(entries);
    setEntries(entries.filter((e) => e.id !== id));
    toast.success('Slot removed');
  };

  const handleDuplicateSlot = (entry: TimetableEntry) => {
    pushToHistory(entries);
    const duplicated: TimetableEntry = {
      ...entry,
      id: `duplicate-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 100, // Duped cell is user-validated
      lowConfidenceFields: [],
    };
    setEntries([...entries, duplicated]);
    toast.success(`Duplicated slot for ${entry.subjectName}`);
  };

  const handleUpdateField = (id: string, field: keyof TimetableEntry, value: any) => {
    pushToHistory(entries);
    setEntries(
      entries.map((entry) => {
        if (entry.id === id) {
          const updated = { ...entry, [field]: value };
          if (field === 'subjectName') {
            updated.subjectColor = getColorForSubject(value);
          }
          if (field === 'dayOfWeek') {
            updated.day = days[value - 1] || 'Monday';
          }
          return updated;
        }
        return entry;
      })
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit. Please upload a smaller image or PDF.');
      return;
    }

    setIsExtracting(true);
    toast.loading('Initializing timetable import...', { id: 'ocr' });

    try {
      let parsed;
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const text = await ocrService.extractTextFromPDF(file);
        parsed = ocrService.parseTimetableText(text);
      } else {
        parsed = await ocrService.extractTimetableFromImage(file, (p) => {
          toast.loading(`${p.stage}: ${p.detail || `${p.progress}%`}`, { id: 'ocr' });
        });
      }

      if (!parsed.slots || parsed.slots.length === 0) {
        throw new Error("We couldn't detect your timetable. Try uploading a clearer image or PDF.");
      }

      toast.success('Timetable layout extracted successfully!', { id: 'ocr' });
      setEntries(parsed.slots);
      setSemester(parsed.semester);
      setHistory([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "We couldn't detect your timetable. Try uploading a clearer image or PDF.", { id: 'ocr' });
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportSubmit = async (keepHistory: boolean) => {
    setConfirmModal(false);
    if (entries.length === 0) {
      toast.error('Please add at least one class slot before importing.');
      return;
    }

    toast.loading('Importing schedule layout...', { id: 'import' });
    try {
      await college.importTimetable(uid, entries, semester, imageUrl);
      await attendance.syncSubjectsFromTimetable(uid, entries, keepHistory);
      toast.success(`Successfully imported ${entries.length} slots!`, { id: 'import' });
      navigate('/college');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import timetable.', { id: 'import' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 px-4 font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/college')}
            className="text-xs text-accent font-bold hover:underline flex items-center space-x-1 cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Review Timetable</h1>
          <p className="text-dark-text-secondary text-sm">
            Review the detected timetable before saving.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="flex space-x-2 w-full sm:w-auto">
            {history.length > 0 && (
              <button
                onClick={handleUndo}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
                title="Undo last change"
              >
                <Undo2 className="w-4 h-4" />
                <span className="hidden sm:inline">Undo</span>
              </button>
            )}
            <button
              onClick={handleAddSlot}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5 flex-1 sm:flex-initial justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Slot</span>
            </button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-dark-text-secondary border border-slate-800/50 max-w-xl mx-auto space-y-6 mt-8">
          {/* Calendar Illustration wrapper */}
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
            <Calendar className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No timetable detected</h3>
            <p className="text-xs text-dark-text-secondary max-w-xs mx-auto leading-relaxed">
              Upload a timetable image or PDF, or add your first class manually.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {/* Hidden local uploader */}
            <input
              type="file"
              accept="image/*,.pdf,.jpg,.jpeg,.png"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={isExtracting}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-3 px-6 rounded-2xl cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
              disabled={isExtracting}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Parsing...</span>
                </>
              ) : (
                <span>Upload Timetable</span>
              )}
            </button>
            <button
              onClick={handleAddSlot}
              className="border border-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-2xl cursor-pointer"
            >
              Add Class
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Semester and Metadata Edit Card */}
          <div className="glass rounded-3xl p-5 border border-slate-800/50 shadow-md max-w-sm">
            <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">
              Semester
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full input-field text-sm font-bold text-white bg-slate-950/40"
              placeholder="e.g. Semester 3"
              required
            />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {entries.map((entry) => {
                const confidenceVal = entry.confidence ?? 100;
                const isLowConfidence = confidenceVal < 80;

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`glass rounded-3xl p-5 border shadow-md flex flex-col justify-between transition-all duration-300 ${
                      isLowConfidence 
                        ? 'bg-amber-500/[0.03] border-amber-500/40 shadow-amber-500/5' 
                        : 'border-slate-800/50 hover:border-slate-700/60'
                    }`}
                  >
                    {/* Low Confidence warning badge & indicators */}
                    <div className="flex justify-between items-center mb-4">
                      {isLowConfidence ? (
                        <div className="flex items-center space-x-2 text-[10px] text-warning font-bold uppercase tracking-wider bg-warning/10 px-2.5 py-1 rounded-xl border border-warning/15">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          <span>Verify details (Low Confidence)</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-success font-bold uppercase tracking-wider bg-success/10 px-2.5 py-1 rounded-xl border border-success/15">
                          Confidence: {confidenceVal}%
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDuplicateSlot(entry)}
                          className="p-2 hover:bg-slate-800/80 rounded-xl text-dark-text-secondary hover:text-white cursor-pointer transition-colors"
                          title="Duplicate slot"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(entry.id)}
                          className="p-2 hover:bg-slate-800/80 rounded-xl text-dark-text-secondary hover:text-error cursor-pointer transition-colors"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Subject Name & Type */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            Subject Name
                          </label>
                          <input
                            type="text"
                            value={entry.subjectName}
                            onChange={(e) => handleUpdateField(entry.id, 'subjectName', e.target.value)}
                            className="w-full input-field text-xs font-bold text-white bg-slate-950/20"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            Type
                          </label>
                          <select
                            value={entry.type}
                            onChange={(e) => handleUpdateField(entry.id, 'type', e.target.value)}
                            className="w-full input-field text-xs bg-slate-950/20 text-white font-bold"
                          >
                            {types.map((t) => (
                              <option key={t} value={t} className="bg-slate-900">
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Day and Timing Slots */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            Day
                          </label>
                          <select
                            value={entry.dayOfWeek}
                            onChange={(e) => handleUpdateField(entry.id, 'dayOfWeek', parseInt(e.target.value, 10))}
                            className="w-full input-field text-xs bg-slate-950/20 text-white font-bold"
                          >
                            {days.map((d, idx) => (
                              <option key={d} value={idx + 1} className="bg-slate-900">
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            Start Time
                          </label>
                          <input
                            type="text"
                            placeholder="HH:mm"
                            value={entry.startTime}
                            onChange={(e) => handleUpdateField(entry.id, 'startTime', e.target.value)}
                            className="w-full input-field text-xs font-mono bg-slate-950/20 text-white font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            End Time
                          </label>
                          <input
                            type="text"
                            placeholder="HH:mm"
                            value={entry.endTime}
                            onChange={(e) => handleUpdateField(entry.id, 'endTime', e.target.value)}
                            className="w-full input-field text-xs font-mono bg-slate-950/20 text-white font-bold"
                            required
                          />
                        </div>
                      </div>

                      {/* Room & Teacher */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            Room
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. L-101"
                            value={entry.room || ''}
                            onChange={(e) => handleUpdateField(entry.id, 'room', e.target.value)}
                            className="w-full input-field text-xs bg-slate-950/20 text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-dark-text-secondary uppercase mb-1.5">
                            Teacher (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Dr. Roy"
                            value={entry.teacher || ''}
                            onChange={(e) => handleUpdateField(entry.id, 'teacher', e.target.value)}
                            className="w-full input-field text-xs bg-slate-950/20 text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Floating Bottom Sync Banner */}
      {entries.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 max-w-4xl mx-auto px-4 z-40">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex justify-between items-center shadow-2xl glass">
            <span className="text-xs text-dark-text-secondary font-semibold pl-2">
              Ready to import <span className="text-white font-extrabold">{entries.length} slots</span> into your database.
            </span>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/college')}
                className="px-4 py-2.5 border border-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmModal(true)}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20"
              >
                Import Timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync/Replace Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Replace Timetable?</h3>
            <p className="text-xs text-dark-text-secondary mb-5 leading-relaxed">
              Do you want to retain your existing class attendance history logs? Selecting NO will reset all subject logs.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => handleImportSubmit(true)}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-2xl text-xs transition-all duration-200 cursor-pointer"
              >
                YES (KEEP ATTENDANCE HISTORY)
              </button>
              <button
                onClick={() => handleImportSubmit(false)}
                className="w-full border border-slate-800 hover:bg-slate-900 text-error font-bold py-3.5 rounded-2xl text-xs transition-all duration-200 cursor-pointer"
              >
                NO (RESET ALL LOGS)
              </button>
              <button
                onClick={() => setConfirmModal(false)}
                className="w-full text-dark-text-secondary hover:text-white font-semibold text-xs py-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetablePreview;
