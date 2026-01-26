import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, CheckCircle, Circle, MessageSquare, Bug, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';
import type { Feedback } from '../../types';
import { format } from 'date-fns';

interface AdminFeedbackListProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminFeedbackList = ({ isOpen, onClose }: AdminFeedbackListProps) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'completed'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
    }
  }, [isOpen]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFeedbacks(data as Feedback[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'new' | 'read' | 'completed') => {
    // Optimistic update
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    
    await supabase.from('feedback').update({ status }).eq('id', id);
  };

  if (!isOpen) return null;

  const filteredFeedbacks = feedbacks.filter(f => filter === 'all' || f.status === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4 text-amber-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#e0e5ec] rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col border border-white/50">
        <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-bold text-slate-700">Developer Feedback</h3>
             <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase">Admin Only</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/50 flex gap-2">
           {(['all', 'new', 'read', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                   "px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                   filter === f ? "neu-pressed text-indigo-600" : "neu-flat text-slate-500 hover:text-slate-700"
                )}
              >
                {f}
              </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {loading ? (
             <div className="text-center py-12 text-slate-400">Loading...</div>
           ) : filteredFeedbacks.length === 0 ? (
             <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                <MessageSquare className="w-8 h-8 opacity-20" />
                <p>No feedback found.</p>
             </div>
           ) : (
             filteredFeedbacks.map((item) => (
                <div key={item.id} className={clsx("neu-flat p-4 flex gap-4 transition-all", item.status === 'completed' ? 'opacity-60' : '')}>
                   <div className="mt-1 shrink-0">{getIcon(item.type)}</div>
                   <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase text-slate-400">{item.user_email || 'Anonymous'}</span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400">{format(new Date(item.created_at), 'MMM d, h:mm a')}</span>
                         </div>
                         <div className="flex gap-1">
                            <button 
                              onClick={() => updateStatus(item.id, 'new')}
                              title="Mark New"
                              className={clsx("p-1.5 rounded hover:bg-slate-200", item.status === 'new' ? "text-indigo-500" : "text-slate-300")}
                            >
                               <Circle className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => updateStatus(item.id, 'completed')}
                              title="Mark Completed"
                              className={clsx("p-1.5 rounded hover:bg-slate-200", item.status === 'completed' ? "text-emerald-500" : "text-slate-300")}
                            >
                               <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.message}</p>
                      
                      <div className="pt-2 flex gap-2">
                         <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border", 
                            item.status === 'new' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            item.status === 'read' ? "bg-slate-100 text-slate-600 border-slate-200" :
                            "bg-emerald-50 text-emerald-600 border-emerald-100"
                         )}>
                            {item.status.toUpperCase()}
                         </span>
                      </div>
                   </div>
                </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};
