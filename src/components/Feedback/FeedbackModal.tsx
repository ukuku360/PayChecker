import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Send, MessageSquare, Bug, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

type FeedbackType = 'feedback' | 'feature_request' | 'bug';

export const FeedbackModal = ({ isOpen, onClose, userEmail }: FeedbackModalProps) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<FeedbackType>('feedback');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (t: FeedbackType) => {
    switch (t) {
      case 'bug': return <Bug className="w-4 h-4" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (t: FeedbackType) => {
    switch (t) {
      case 'bug': return 'Bug Report';
      case 'feature_request': return 'Feature Request';
      default: return 'General Feedback';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#e0e5ec] rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-white/50">
        <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-700">Send Feedback</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
             <div className="w-12 h-12 bg-emerald-100/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
                <Send className="w-6 h-6" />
             </div>
             <h4 className="text-xl font-bold text-slate-700">Thank You!</h4>
             <p className="text-slate-500 text-sm">Your feedback has been sent to the developer.</p>
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
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="neu-pressed w-full h-32 px-4 py-3 rounded-xl border-none focus:ring-0 text-slate-700 text-sm placeholder-slate-400 resize-none bg-[#e0e5ec] shadow-inner"
                placeholder="Tell us what you think..."
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
                  <span className="opacity-80">Sending...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-0.5" />
                    <span>Send Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
