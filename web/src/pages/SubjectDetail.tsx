import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { 
  ArrowLeft, Trash2, Plus, Check, X, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SubjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { user } = useAuthStore();
  const attendance = useAttendanceStore();
  const uid = user?.uid || '';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'calendar'>('overview');
  const [logModal, setLogModal] = useState(false);

  // Month for calendar toggler
  const [focusedMonth, setFocusedMonth] = useState<Date>(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (uid) {
      attendance.loadAttendance(uid);
    }
  }, [uid]);

  const subject = attendance.subjects.find((s) => s.id === id);
  if (!subject) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-xl font-bold">Subject not found</h2>
        <button
          onClick={() => navigate('/college')}
          className="mt-4 bg-primary px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
        >
          Back to College Hub
        </button>
      </div>
    );
  }

  // Filter records for this subject
  const subjectRecords = attendance.records
    .filter((r) => r.subjectId === id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Recalculated dynamic stats for this subject
  const totalCount = subjectRecords.length;
  const attendedCount = subjectRecords.filter((r) => r.status === 'present').length;
  const absentCount = totalCount - attendedCount;
  const theoryCount = subjectRecords.filter((r) => r.type === 'Lecture').length;
  const labCount = subjectRecords.filter((r) => r.type === 'Lab').length;
  
  const percentage = totalCount === 0 ? 100 : (attendedCount / totalCount) * 100;
  const isBelowTarget = percentage < subject.targetPercentage;

  const handleDeleteSubject = async () => {
    if (confirm(`Are you sure you want to delete "${subject.name}"? This deletes all associated attendance logs.`)) {
      try {
        await attendance.deleteSubject(subject.id);
        toast.success('Subject deleted successfully!');
        navigate('/college');
      } catch (err) {
        toast.error('Failed to delete subject.');
      }
    }
  };

  const handleToggleRecord = async (recordId: string) => {
    try {
      await attendance.toggleRecordStatus(recordId);
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm('Delete this class log?')) {
      try {
        await attendance.deleteRecord(recordId);
        toast.success('Record deleted');
      } catch (err) {
        toast.error('Failed to delete record.');
      }
    }
  };

  const handleManualLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'Lecture' | 'Lab';
    const status = formData.get('status') as 'present' | 'absent';

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    try {
      await attendance.logAttendance(uid, subject.name, status === 'present', new Date(date).toISOString(), type);
      toast.success('Class session logged!');
      setLogModal(false);
    } catch (err) {
      toast.error('Failed to log attendance');
    }
  };

  // Calendar parameters
  const year = focusedMonth.getFullYear();
  const month = focusedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  const firstWeekdayMapped = firstWeekday === 0 ? 6 : firstWeekday - 1; // Map Sun to 6, Mon to 0
  const monthLabel = focusedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Check logs for a given date YYYY-MM-DD
  const getLogsForDate = (dateStr: string) => {
    return subjectRecords.filter((r) => r.date.split('T')[0] === dateStr);
  };

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      {/* Upper header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/college')}
            className="p-2.5 bg-dark-card hover:bg-slate-800 rounded-xl border border-slate-800/80 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-dark-text-secondary hover:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none mb-1">{subject.name}</h1>
            <span className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider">Subject Analytics</span>
          </div>
        </div>

        <button
          onClick={handleDeleteSubject}
          className="p-2.5 bg-slate-900/50 hover:bg-error/10 border border-slate-800 rounded-xl text-dark-text-secondary hover:text-error transition-all cursor-pointer"
          title="Delete Subject"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Cards */}
      <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col md:flex-row justify-between items-center shadow-lg gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2
            className="text-5xl font-black tracking-tight"
            style={{ color: isBelowTarget ? '#EF4444' : '#22C55E' }}
          >
            {percentage.toFixed(0)}%
          </h2>
          <p className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider block">Attendance Percentage</p>
          <div
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isBelowTarget ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
            }`}
          >
            {isBelowTarget ? 'Below Target' : 'On Track'}
          </div>
        </div>

        {/* Detailed Grid Counters */}
        <div className="flex-1 grid grid-cols-3 gap-4 w-full">
          <div className="bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/40 text-center">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Present</span>
            <span className="text-xl font-extrabold text-success">{attendedCount}</span>
          </div>
          <div className="bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/40 text-center">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Absent</span>
            <span className="text-xl font-extrabold text-error">{absentCount}</span>
          </div>
          <div className="bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/40 text-center">
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Total</span>
            <span className="text-xl font-extrabold text-white">{totalCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/40 text-center">
        <div>
          <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Theory Classes</span>
          <span className="text-md font-extrabold text-cyan-400">{theoryCount}</span>
        </div>
        <div className="border-l border-slate-800/50">
          <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Lab Sessions</span>
          <span className="text-md font-extrabold text-amber-500">{labCount}</span>
        </div>
      </div>

      {/* Choice Chips Toggler */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/50">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-slate-900 text-white border border-slate-800/80 shadow-md'
              : 'text-dark-text-secondary hover:text-white'
          }`}
        >
          Overview History
        </button>
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
            activeSubTab === 'calendar'
              ? 'bg-slate-900 text-white border border-slate-800/80 shadow-md'
              : 'text-dark-text-secondary hover:text-white'
          }`}
        >
          Monthly Calendar
        </button>
      </div>

      {/* Toggle View Area */}
      {activeSubTab === 'overview' ? (
        // Overview List
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white m-0">Class Sessions</h3>
            <button
              onClick={() => setLogModal(true)}
              className="bg-primary hover:bg-primary/95 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Session</span>
            </button>
          </div>

          <div className="space-y-3">
            {subjectRecords.length === 0 ? (
              <p className="text-xs text-dark-text-secondary italic text-center py-6">No classes logged for this subject yet.</p>
            ) : (
              <AnimatePresence>
                {subjectRecords.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    className="glass rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between hover:border-slate-700/60 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3.5">
                      <button
                        onClick={() => handleToggleRecord(r.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border cursor-pointer ${
                          r.status === 'present'
                            ? 'border-success bg-success/15 text-success'
                            : 'border-error bg-error/15 text-error'
                        }`}
                      >
                        {r.status === 'present' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-none mb-1">
                          {new Date(r.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </h4>
                        <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">
                          {r.type} class ({r.status === 'present' ? 'Present' : 'Absent'})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRecord(r.id)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-error cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      ) : (
        // Calendar View
        <div className="space-y-4">
          <div className="glass rounded-3xl p-6 border border-slate-800/50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setFocusedMonth(new Date(year, month - 1))}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
              >
                &lt;
              </button>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{monthLabel}</h3>
              <button
                onClick={() => setFocusedMonth(new Date(year, month + 1))}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-dark-text-secondary hover:text-white cursor-pointer"
              >
                &gt;
              </button>
            </div>

            {/* Labels */}
            <div className="grid grid-cols-7 gap-2 mb-4 text-center text-xs font-bold text-dark-text-secondary">
              {weekLabels.map((lbl, idx) => <span key={idx}>{lbl}</span>)}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {Array.from({ length: firstWeekdayMapped }).map((_, idx) => (
                <div key={`fill-${idx}`} className="h-10 opacity-0" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                const logs = getLogsForDate(dateStr);
                const hasLogs = logs.length > 0;
                
                // Color mapping
                let dotColor = '';
                if (hasLogs) {
                  const presentLog = logs.some((l) => l.status === 'present');
                  dotColor = presentLog ? 'bg-success border-success/30' : 'bg-error border-error/30';
                }

                const isSelected = selectedDayStr === dateStr;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDayStr(dateStr)}
                    className={`h-10 rounded-full flex flex-col items-center justify-center relative cursor-pointer hover:bg-slate-800/40 border ${
                      isSelected
                        ? 'border-accent bg-accent/10 font-bold text-accent'
                        : 'border-transparent text-white'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasLogs && (
                      <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${dotColor}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logs for Selected Day */}
          <div className="space-y-4 bg-slate-900/20 p-5 rounded-3xl border border-slate-800/50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-bold text-white m-0">
                Logs for {new Date(selectedDayStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </h4>
              <button
                onClick={() => setLogModal(true)}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Log class here
              </button>
            </div>

            <div className="space-y-2">
              {getLogsForDate(selectedDayStr).length === 0 ? (
                <p className="text-xs text-dark-text-secondary italic">No attendance logged for this day.</p>
              ) : (
                getLogsForDate(selectedDayStr).map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/30"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          r.status === 'present' ? 'bg-success' : 'bg-error'
                        }`}
                      />
                      <span className="text-xs font-bold text-white capitalize">{r.type} class ({r.status})</span>
                    </div>

                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => handleToggleRecord(r.id)}
                        className="text-xs text-accent font-bold hover:underline cursor-pointer"
                      >
                        Toggle
                      </button>
                      <span className="text-slate-800">|</span>
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="text-xs text-error font-bold hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-dark-card border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-4">Log Attendance</h3>
            <form onSubmit={handleManualLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Class Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDayStr}
                  className="w-full input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Class Type</label>
                  <select name="type" className="w-full input-field">
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">Status</label>
                  <select name="status" className="w-full input-field">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setLogModal(false)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-primary/25"
                >
                  Log Session
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetail;
