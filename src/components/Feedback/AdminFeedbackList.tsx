import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, CheckCircle, Circle, MessageSquare, Bug, Lightbulb, Send } from 'lucide-react';
import { clsx } from 'clsx';
import type { Feedback, FeedbackReply } from '../../types';
import { format } from 'date-fns';

interface AdminFeedbackListProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminFeedbackList = ({ isOpen, onClose }: AdminFeedbackListProps) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'completed'>('all');
  const [selectedUser, setSelectedUser] = useState<string | 'all'>('all'); // New state for user filter
  const [errorState, setErrorState] = useState<string | null>(null);
  
  // Moved up to adhere to Rules of Hooks - Removed as they are unused here


  useEffect(() => {
    if (isOpen) {
      const fetchFeedbacks = async () => {
        setLoading(true);
        setErrorState(null);
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching feedback:', error);
          setErrorState(error.message);
        } else if (data) {
          setFeedbacks(data as Feedback[]);
        }
        setLoading(false);
      };

      fetchFeedbacks();
    }
  }, [isOpen]);

  const updateStatus = async (id: string, status: 'new' | 'read' | 'completed') => {
    // Optimistic update
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    
    await supabase.from('feedback').update({ status }).eq('id', id);
  };

  const safeFormat = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  // Hooks are done, now we can return 
  if (!isOpen) return null;

  // Filter logic
  const filteredFeedbacks = feedbacks.filter(f => {
    const statusMatch = filter === 'all' || (f.status || 'new') === filter;
    const userMatch = selectedUser === 'all' || (f.user_email || 'Anonymous') === selectedUser;
    return statusMatch && userMatch;
  });

  // Extract unique users
  const uniqueUsers = Array.from(new Set(feedbacks.map(f => f.user_email || 'Anonymous')));
  // Sort users: Put 'Anonymous' last, others alphabetical or by recent activity
  uniqueUsers.sort();

  const getIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4 text-amber-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#e0e5ec] rounded-2xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col border border-white/50 overflow-hidden">
        <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-bold text-slate-700">Developer Feedback</h3>
             <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase">Admin Only</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Users */}
          <div className="w-64 border-r border-slate-200/50 bg-slate-50/30 overflow-y-auto p-2 space-y-1 shrink-0">
            <button
               onClick={() => setSelectedUser('all')}
               className={clsx(
                 "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center",
                 selectedUser === 'all' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:bg-slate-100"
               )}
            >
              <span>All Users</span>
              <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px]">{feedbacks.length}</span>
            </button>
            <div className="h-px bg-slate-200/50 my-2 mx-2" />
            
            {uniqueUsers.map(user => {
               // Count filtered items for this user (ignoring status filter for count, or keeping it?)
               // Let's show total items count for the user
               const count = feedbacks.filter(f => (f.user_email || 'Anonymous') === user).length;
               // Check if there are new items
               const hasNew = feedbacks.some(f => (f.user_email || 'Anonymous') === user && (f.status || 'new') === 'new');
               
               return (
                <button
                   key={user}
                   onClick={() => setSelectedUser(user)}
                   className={clsx(
                     "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center",
                     selectedUser === user ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:bg-slate-100"
                   )}
                >
                  <span className="truncate flex-1 pr-2">{user}</span>
                  <div className="flex items-center gap-1">
                    {hasNew && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />}
                    <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
                  </div>
                </button>
               );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
             {/* Status Filters */}
             <div className="p-4 border-b border-white/50 flex gap-2 shrink-0 bg-[#e0e5ec]">
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
                ) : errorState ? (
                  <div className="text-center py-12 text-red-400 flex flex-col items-center gap-2">
                     <Bug className="w-8 h-8 opacity-20" />
                     <p>Error loading feedback</p>
                     <p className="text-xs">{errorState}</p>
                  </div>
                ) : filteredFeedbacks.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                     <MessageSquare className="w-8 h-8 opacity-20" />
                     <p>No feedback found.</p>
                  </div>
                ) : (
                  filteredFeedbacks.map((item) => (
                     <AdminFeedbackItem 
                        key={item.id} 
                        item={item} 
                        safeFormat={safeFormat} 
                        getIcon={getIcon}
                        updateStatus={updateStatus} 
                     />
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminFeedbackItemProps {
  item: Feedback;
  safeFormat: (dateStr: string | undefined | null) => string;
  getIcon: (type: string) => React.ReactNode;
  updateStatus: (id: string, status: 'new' | 'read' | 'completed') => Promise<void>;
}

const AdminFeedbackItem = ({ item, safeFormat, getIcon, updateStatus }: AdminFeedbackItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<FeedbackReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const toggleExpand = () => {
    const newState = !expanded;
    setExpanded(newState);
    if (newState && replies.length === 0) {
       fetchReplies();
    }
  };

  const fetchReplies = async () => {
    setLoadingReplies(true);
    const { data } = await supabase
      .from('feedback_replies')
      .select('*')
      .eq('feedback_id', item.id)
      .order('created_at', { ascending: true });
    
    if (data) setReplies(data);
    setLoadingReplies(false);
  };

  const sendReply = async () => {
    if (!replyMessage.trim()) return;
    setSendingReply(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Insert reply
    await supabase.from('feedback_replies').insert({
       feedback_id: item.id,
       sender_id: user.id,
       content: replyMessage,
       is_admin_reply: true
    });

    // 2. Update status to 'read' if not already
    await supabase.from('feedback').update({ status: 'read' }).eq('id', item.id);

    setReplyMessage('');
    fetchReplies();
    setSendingReply(false);
  };

  return (
    <div className={clsx("neu-flat p-4 flex gap-4 transition-all", item.status === 'completed' ? 'opacity-60' : '')}>
       <div className="mt-1 shrink-0">{getIcon(item.type)}</div>
       <div className="flex-1 space-y-2">
          <div className="flex justify-between items-start cursor-pointer" onClick={toggleExpand}>
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-400">{item.user_email || 'Anonymous'}</span>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[10px] text-slate-400">{safeFormat(item.created_at)}</span>
             </div>
             <div className="flex gap-1 items-center">
                <button className="text-xs text-indigo-500 font-bold mr-2">
                  {expanded ? 'Hide' : 'Reply / View'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'new'); }}
                  title="Mark New"
                  className={clsx("p-1.5 rounded hover:bg-slate-200", item.status === 'new' ? "text-indigo-500" : "text-slate-300")}
                >
                   <Circle className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'completed'); }}
                  title="Mark Completed"
                  className={clsx("p-1.5 rounded hover:bg-slate-200", item.status === 'completed' ? "text-emerald-500" : "text-slate-300")}
                >
                   <CheckCircle className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
          {!expanded && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-slate-100 text-slate-700 rounded-2xl rounded-tl-none p-3 text-sm whitespace-pre-wrap">
                <p className="text-[10px] text-slate-400 font-bold mb-1">User</p>
                {item.message}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 items-center">
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border", 
                 (item.status || 'new') === 'new' ? "bg-blue-50 text-blue-600 border-blue-100" :
                 (item.status || 'new') === 'read' ? "bg-slate-100 text-slate-600 border-slate-200" :
                 "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                 {(item.status || 'NEW').toUpperCase()}
              </span>
          </div>

          {/* Expanded View */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-4">
               <div className="flex justify-start">
                 <div className="max-w-[85%] bg-slate-100 text-slate-700 rounded-2xl rounded-tl-none p-3 text-sm whitespace-pre-wrap">
                   <p className="text-[10px] text-slate-400 font-bold mb-1">User</p>
                   {item.message}
                 </div>
               </div>
               {/* Legacy Reply showing as first message if exists */}
               {item.admin_reply && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-indigo-500 text-white shadow-md shadow-indigo-500/20 rounded-2xl rounded-tr-none p-3 text-sm">
                      <p className="text-[10px] text-indigo-200 font-bold mb-1">Admin (Legacy)</p>
                      {item.admin_reply}
                    </div>
                  </div>
               )}

               {loadingReplies ? (
                 <div className="text-center text-xs text-slate-400 py-2">Loading replies...</div>
               ) : (
                 replies.map(reply => (
                   <div key={reply.id} className={clsx("flex", reply.is_admin_reply ? "justify-end" : "justify-start")}>
                     <div className={clsx(
                       "max-w-[85%] rounded-2xl p-3 text-sm",
                       reply.is_admin_reply 
                         ? "bg-indigo-500 rounded-tr-none text-white shadow-md shadow-indigo-500/20" 
                         : "bg-slate-100 rounded-tl-none text-slate-700"
                     )}>
                        <p className={clsx("text-[10px] font-bold mb-1", reply.is_admin_reply ? "text-indigo-200" : "text-slate-400")}>
                          {reply.is_admin_reply ? "Admin" : "User"}
                        </p>
                        {reply.content}
                     </div>
                   </div>
                 ))
               )}

               <div className="flex gap-2 mt-4 pt-2">
                 <input 
                   type="text" 
                   value={replyMessage}
                   onChange={(e) => setReplyMessage(e.target.value)}
                   placeholder="Reply to user..."
                   className="flex-1 neu-pressed px-3 py-2 text-sm rounded-xl bg-transparent outline-none"
                   autoFocus
                 />
                 <button 
                   onClick={sendReply}
                   disabled={sendingReply || !replyMessage.trim()}
                   className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                 >
                   <Send className="w-4 h-4" />
                 </button>
               </div>
            </div>
          )}
       </div>
    </div>
  );

};
