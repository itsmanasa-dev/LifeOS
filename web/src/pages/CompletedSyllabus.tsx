import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStudyStore } from '../store/useStudyStore';
import { 
  ArrowLeft, Search, Trash2, BookOpen, Clock, 
  Award, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { CompletedSyllabusItem } from '../types';

const CompletedSyllabus: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const study = useStudyStore();
  const uid = user?.uid || '';

  // Local state for completed notes
  const [completedItems, setCompletedItems] = useState<CompletedSyllabusItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (uid) {
      fetchCompletedItems();
    }
  }, [uid]);

  const fetchCompletedItems = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'completed_syllabus'),
        where('userId', '==', uid),
        orderBy('completedAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: CompletedSyllabusItem[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as CompletedSyllabusItem);
      });
      setCompletedItems(list);
    } catch (e) {
      console.error('Error fetching completed syllabus:', e);
      toast.error('Failed to load completed syllabus items.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this topic from your completed logs?')) {
      try {
        setCompletedItems(prev => prev.filter(item => item.id !== id));
        deleteDoc(doc(db, 'completed_syllabus', id)).catch(e => {
          console.error('Failed to delete completed syllabus item in background:', e);
        });
        toast.success('Completed item deleted.');
        
        // Also refresh global store
        if (uid) {
          study.loadStudyData(uid);
        }
      } catch (e) {
        console.error('Failed to delete completed syllabus item:', e);
        toast.error('Failed to delete item.');
      }
    }
  };

  // Filter calculations
  const getUniqueSubjects = () => {
    const subjects = new Set<string>();
    completedItems.forEach(item => subjects.add(item.subject));
    return Array.from(subjects);
  };

  const getFilteredItems = () => {
    return completedItems.filter(item => {
      const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSubject = subjectFilter === 'all' || 
                            item.subject.toLowerCase() === subjectFilter.toLowerCase();
      const matchPriority = priorityFilter === 'all' || 
                            item.priority === priorityFilter;
      return matchSearch && matchSubject && matchPriority;
    });
  };

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'low': return 'bg-slate-500/10 text-slate-500 border border-slate-800';
      default: return 'bg-slate-900 text-white';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Cumulative Stats
  const getTotalTimeSpent = () => {
    const totalMins = completedItems.reduce((acc, item) => acc + (item.timeTaken || 0), 0);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6 pb-24 text-dark-text-primary text-left">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/govexam')}
            className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-white rounded-2xl cursor-pointer transition-all"
            title="Back to Study Tracker"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Completed Syllabus
            </h1>
            <p className="text-dark-text-secondary text-sm">Review your mastered examination topics, completion dates, and study times.</p>
          </div>
        </div>

        <button
          onClick={fetchCompletedItems}
          disabled={isLoading}
          className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 disabled:opacity-30 rounded-2xl text-white cursor-pointer transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="glass rounded-3xl p-5 border border-slate-850 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/25">
            <BookOpen className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Completed Topics</span>
            <span className="text-2xl font-black text-white">{completedItems.length} Notes</span>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 border border-slate-850 flex items-center space-x-4">
          <div className="p-3 bg-accent/10 rounded-2xl border border-accent/25">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <div>
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Total Time Taken</span>
            <span className="text-2xl font-black text-white font-mono">{getTotalTimeSpent()}</span>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 border border-slate-850 flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/25">
            <Award className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-dark-text-secondary font-bold uppercase tracking-wider block">Mastery Index</span>
            <span className="text-2xl font-black text-white">
              {completedItems.length > 0 ? `${Math.min(100, Math.round((completedItems.length * 15)))}%` : '0%'}
            </span>
          </div>
        </div>

      </div>

      {/* Search & Filter Options */}
      <div className="glass rounded-3xl p-5 border border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-dark-text-secondary absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by topic title or subject..."
            className="w-full input-field pl-11 text-xs"
          />
        </div>

        {/* Subject Filter */}
        <div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full input-field text-xs cursor-pointer focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {getUniqueSubjects().map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
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

      {/* Completion History Log Table */}
      <div className="glass rounded-3xl border border-slate-850 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-850 text-dark-text-secondary font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Completion Date</th>
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6">Topic Title</th>
                <th className="py-4 px-6">Time Taken</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-dark-text-secondary">
                    Loading completed syllabus logs...
                  </td>
                </tr>
              ) : getFilteredItems().length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-dark-text-secondary">
                    No completed syllabus topics found matching filters.
                  </td>
                </tr>
              ) : (
                getFilteredItems().map(item => (
                  <tr key={item.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">
                      {formatDate(item.completedAt)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-primary/10 text-accent border border-primary/20 px-2.5 py-1 rounded-lg font-bold">
                        {item.subject}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm">{item.title}</div>
                      <div className="text-[10px] text-dark-text-secondary mt-0.5 line-clamp-1">{item.description}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-dark-text-secondary">
                      {item.timeTaken ? `${Math.floor(item.timeTaken / 60)}h ${item.timeTaken % 60}m` : '0m'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getPriorityBadgeColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 hover:bg-slate-900 text-dark-text-secondary hover:text-red-400 rounded-lg cursor-pointer"
                        title="Delete Log"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default CompletedSyllabus;
