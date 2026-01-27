import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isStudentVisa, setIsStudentVisa] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        
        if (data.user && isStudentVisa) {
           await supabase.from('profiles').upsert({
             id: data.user.id,
             is_student_visa_holder: true
           });
        }

        setMessage({ type: 'success', text: 'Registration successful! You can now log in.' });
        setIsSignUp(false); // Switch to login after success
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md glass-panel p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight mb-2">PayChecker</h1>
          <p className="text-slate-500">Sign in to manage your schedule</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neu-pressed w-full px-4 py-3 border-none focus:ring-0 text-sm placeholder-slate-400 text-slate-700"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neu-pressed w-full px-4 py-3 border-none focus:ring-0 text-sm placeholder-slate-400 text-slate-700"
              placeholder="••••••••"
              required
            />
          </div>

          {isSignUp && (
            <div className="flex items-center gap-3 pl-1">
              <input
                type="checkbox"
                id="studentVisa"
                checked={isStudentVisa}
                onChange={(e) => setIsStudentVisa(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-200 border-none rounded focus:ring-indigo-500"
              />
              <label htmlFor="studentVisa" className="text-sm text-slate-600">
                I am an international student on a Student Visa
              </label>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neu-btn w-full !bg-indigo-500 !text-white !shadow-none hover:!bg-indigo-600 mt-4 h-12"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
