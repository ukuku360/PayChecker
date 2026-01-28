import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Send, MessageSquare, Bug, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';
import type { Feedback, FeedbackReply } from '../../types';
import { useTranslation } from 'react-i18next';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

type FeedbackType = 'feedback' | 'feature_request' | 'bug';

export const FeedbackModal = ({ isOpen, onClose, userEmail }: FeedbackModalProps) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<FeedbackType>('feedback');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moved up to adhere to Rules of Hooks
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchMyFeedback();
    }
  }, [isOpen, activeTab]);

  // Reset tab when closing
  useEffect(() => {
    if (!isOpen) setActiveTab('write');
  }, [isOpen]);

  const fetchMyFeedback = async () => {
    setLoadingHistory(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setMyFeedback(data);
    }
    setLoadingHistory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to submit feedback.');

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        message,
        type,
        user_email: userEmail,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Logic moved to top

  // Reset tab when closing
  // Logic moved to top

  const getTypeIcon = (t: FeedbackType) => {
    switch (t) {
      case 'bug': return <Bug className="w-4 h-4" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (tType: FeedbackType) => {
    switch (tType) {
      case 'bug': return t('feedback.bug');
      case 'feature_request': return t('feedback.feature');
      default: return t('feedback.general');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#e0e5ec] rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-white/50 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('write')}
              className={clsx("text-sm font-bold transition-colors", activeTab === 'write' ? "text-slate-700" : "text-slate-400 hover:text-slate-600")}
            >
              {t('feedback.write')}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={clsx("text-sm font-bold transition-colors", activeTab === 'history' ? "text-slate-700" : "text-slate-400 hover:text-slate-600")}
            >
              {t('feedback.history')}
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'write' ? (
            success ? (
              <div className="p-8 text-center space-y-3">
                 <div className="w-12 h-12 bg-emerald-100/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
                    <Send className="w-6 h-6" />
                 </div>
                 <h4 className="text-xl font-bold text-slate-700">{t('feedback.success')}</h4>
                 <p className="text-slate-500 text-sm">{t('feedback.successMsg')}</p>
                 <button 
                   onClick={() => setSuccess(false)}
                   className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-600"
                 >
                   {t('feedback.sendAnother')}
                 </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex gap-2 justify-center mb-2">
                  {(['feedback', 'feature_request', 'bug'] as FeedbackType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={clsx(
                        "flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-2 border shadow-sm",
                        type === t 
                          ? "bg-slate-700 text-white border-slate-700 transform scale-105" 
                          : "bg-[#e0e5ec] text-slate-500 border-white/60 hover:bg-slate-200"
                      )}
                    >
                      {getTypeIcon(t)}
                      <span>{getTypeLabel(t)}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {t('feedback.message')}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="neu-pressed w-full h-32 px-4 py-3 rounded-xl border-none focus:ring-0 text-slate-700 text-sm placeholder-slate-400 resize-none bg-[#e0e5ec] shadow-inner"
                    placeholder={t('feedback.placeholder')}
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="neu-btn w-full flex items-center justify-center gap-2 !bg-indigo-500 !text-white !py-3 hover:!bg-indigo-600"
                  >
                    {loading ? (
                      <span className="opacity-80">{t('feedback.sending')}</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-0.5" />
                        <span>{t('feedback.send')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="p-4 space-y-3">
              {loadingHistory ? (
                <div className="text-center py-8 text-slate-400 text-sm">{t('feedback.loadingHistory')}</div>
              ) : myFeedback.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">{t('feedback.noHistory')}</div>
              ) : (
                myFeedback.map((item) => (
                  <FeedbackHistoryItem key={item.id} item={item} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FeedbackHistoryItem = ({ item }: { item: Feedback }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<FeedbackReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const toggleExpand = async () => {
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

    const { error } = await supabase.from('feedback_replies').insert({
       feedback_id: item.id,
       sender_id: user.id,
       content: replyMessage,
       is_admin_reply: false
    });

    if (!error) {
       setReplyMessage('');
       fetchReplies();
    }
    setSendingReply(false);
  };

  return (
    <div className="neu-flat p-4 rounded-xl transition-all">
      <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={toggleExpand}>
          <div className="flex items-center gap-2">
            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", 
              item.type === 'bug' ? "bg-red-50 text-red-500" : 
              item.type === 'feature_request' ? "bg-amber-50 text-amber-500" : 
              "bg-blue-50 text-blue-500"
            )}>
              {item.type.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
          <button className="text-xs text-indigo-500 font-bold">
            {expanded ? t('feedback.hide') : t('feedback.view')}
          </button>
      </div>
      
      {!expanded && (
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 whitespace-pre-wrap">
            {item.message}
          </div>
        </div>
      )}
      
      {/* Legacy Admin Reply Display (for backward compatibility) */}
      {item.admin_reply && !expanded && (
        <div className="mt-3 flex justify-end">
          <div className="max-w-[85%] bg-indigo-500 rounded-2xl rounded-tr-none p-3 text-sm text-white shadow-md shadow-indigo-500/20">
            <p className="text-[10px] text-indigo-200 font-bold mb-1">{t('feedback.developer')}</p>
            <span className="truncate block">{item.admin_reply}</span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-4">
           <div className="flex justify-start">
             <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 whitespace-pre-wrap">
               {item.message}
             </div>
           </div>
           {/* Legacy Reply showing as first message if exists */}
           {item.admin_reply && (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-indigo-500 rounded-2xl rounded-tr-none p-3 text-sm text-white shadow-md shadow-indigo-500/20">
                  <p className="text-[10px] text-indigo-200 font-bold mb-1">Developer</p>
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
                    {reply.is_admin_reply && <p className="text-[10px] text-indigo-200 font-bold mb-1">Developer</p>}
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
               placeholder="Reply..."
               className="flex-1 neu-pressed px-3 py-2 text-sm rounded-xl bg-transparent outline-none"
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
  );

};
