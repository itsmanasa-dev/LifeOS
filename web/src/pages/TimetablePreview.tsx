import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCollegeStore } from '../store/useCollegeStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { Plus, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getColorForSubject } from '../services/geminiService';
import type { TimetableEntry } from '../types';

const TimetablePreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const college = useCollegeStore();
  const attendance = useAttendanceStore();
  const uid = user?.uid || '';

  // Get initial entries passed from OCR uploader
  const initialEntries = (location.state as any)?.entries as TimetableEntry[] || [];
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [confirmModal, setConfirmModal] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const types = ['Lecture', 'Lab'];

  const handleAddSlot = () => {
    const newSlot: TimetableEntry = {
      id: `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subjectName: 'New Class',
      subjectColor: '#6366F1',
      startTime: '09:00',
      endTime: '09:50',
      room: 'L-101',
      dayOfWeek: 1,
      type: 'Lecture',
      lowConfidenceFields: [],
    };
    setEntries([...entries, newSlot]);
  };

  const handleDeleteSlot = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const handleUpdateField = (id: string, field: keyof TimetableEntry, value: any) => {
    setEntries(
      entries.map((entry) => {
        if (entry.id === id) {
          const updated = { ...entry, [field]: value };
          if (field === 'subjectName') {
            updated.subjectColor = getColorForSubject(value);
          }
          return updated;
        }
        return entry;
      })
    );
  };

  const handleImportSubmit = async (keepHistory: boolean) => {
    setConfirmModal(false);
    if (entries.length === 0) {
      toast.error('Please add at least one class slot before importing.');
      return;
    }

    toast.loading('Importing schedule layout...', { id: 'import' });
    try {
      await college.importTimetable(uid, entries);
      await attendance.syncSubjectsFromTimetable(uid, entries, keepHistory);
      toast.success(`Successfully imported ${entries.length} slots!`, { id: 'import' });
      navigate('/college');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import timetable.', { id: 'import' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate('/college')}
            className="text-xs text-accent font-bold hover:underline flex items-center space-x-1 cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Review Extracted Data</h1>
          <p className="text-dark-text-secondary text-sm">
            Modify timetable details parsed by Gemini AI before syncing them to your database.
          </p>
        </div>
        <button
          onClick={handleAddSlot}
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Slot</span>
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-dark-text-secondary border border-slate-800/50">
          <p className="text-base font-bold mb-4">No parsed slots available to preview.</p>
          <button
            onClick={handleAddSlot}
            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer"
          >
            Add Class Slot Manually
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {entries.map((entry) => {
              const isLowConfidence = entry.lowConfidenceFields && entry.lowConfidenceFields.length > 0;
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`glass rounded-3xl p-5 border shadow-md relative ${
                    isLowConfidence ? 'border-amber-500/50' : 'border-slate-800/50'
                  }`}
                >
                  {isLowConfidence && (
                    <div className="flex items-center space-x-2 text-[10px] text-warning font-bold uppercase tracking-wider mb-4 bg-warning/5 p-2 rounded-xl border border-warning/10 inline-flex">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span>Low confidence fields parsed - please review</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Subject Name Input */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Subject Name</label>
                      <input
                        type="text"
                        value={entry.subjectName}
                        onChange={(e) => handleUpdateField(entry.id, 'subjectName', e.target.value)}
                        className="w-full input-field text-sm font-semibold"
                        required
                      />
                    </div>

                    {/* Class Type selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Class Type</label>
                      <select
                        value={entry.type}
                        onChange={(e) => handleUpdateField(entry.id, 'type', e.target.value)}
                        className="w-full input-field text-sm"
                      >
                        {types.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                    {/* Day Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Day</label>
                      <select
                        value={entry.dayOfWeek}
                        onChange={(e) => handleUpdateField(entry.id, 'dayOfWeek', parseInt(e.target.value, 10))}
                        className="w-full input-field text-sm"
                      >
                        {days.map((d, idx) => (
                          <option key={d} value={idx + 1}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Start Time</label>
                      <input
                        type="text"
                        placeholder="HH:mm"
                        value={entry.startTime}
                        onChange={(e) => handleUpdateField(entry.id, 'startTime', e.target.value)}
                        className="w-full input-field text-sm font-mono"
                        required
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">End Time</label>
                      <input
                        type="text"
                        placeholder="HH:mm"
                        value={entry.endTime}
                        onChange={(e) => handleUpdateField(entry.id, 'endTime', e.target.value)}
                        className="w-full input-field text-sm font-mono"
                        required
                      />
                    </div>

                    {/* Room */}
                    <div className="relative">
                      <label className="block text-[10px] font-bold text-dark-text-secondary uppercase mb-2">Room</label>
                      <input
                        type="text"
                        placeholder="L-101"
                        value={entry.room || ''}
                        onChange={(e) => handleUpdateField(entry.id, 'room', e.target.value || undefined)}
                        className="w-full input-field text-sm font-semibold"
                      />
                      <button
                        onClick={() => handleDeleteSlot(entry.id)}
                        className="absolute right-[-45px] sm:right-[-35px] bottom-3 p-2 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error cursor-pointer"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
