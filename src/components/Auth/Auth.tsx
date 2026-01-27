import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  getAuthErrorMessage,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  PASSWORD_REQUIREMENTS
} from './authErrors';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [isStudentVisa, setIsStudentVisa] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; title?: string; text: string } | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Clear form errors and message when switching modes
  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setMessage(null);
    setFormErrors({});
    if (newMode !== 'signUp') {
      setConfirmPassword('');
    }
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    if (mode !== 'forgotPassword') {
      const passwordError = validatePassword(password);
      if (passwordError) errors.password = passwordError;

      if (mode === 'signUp') {
        const confirmError = validatePasswordConfirmation(password, confirmPassword);
        if (confirmError) errors.confirmPassword = confirmError;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear specific field error when user types
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (formErrors.confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation first
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'forgotPassword') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`
        });
        if (error) throw error;

        setMessage({
          type: 'success',
          title: 'Password reset email sent',
          text: 'Check your inbox for a link to reset your password.'
        });
      } else if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;

        if (data.user && isStudentVisa) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              is_student_visa_holder: true
            });
          } catch (profileError) {
            // Log but don't fail signup for profile creation errors
            console.error('Profile creation error:', profileError);
          }
        }

        setMessage({
          type: 'success',
          title: 'Registration successful!',
          text: 'Please check your email to verify your account, then sign in.'
        });
        handleModeSwitch('signIn');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: unknown) {
      const errorInfo = getAuthErrorMessage(error);
      setMessage({
        type: 'error',
        title: errorInfo.title,
        text: errorInfo.description
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signUp':
        return 'Create an account to get started';
      case 'forgotPassword':
        return 'Enter your email to receive a reset link';
      default:
        return 'Sign in to manage your schedule';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Processing...';
    switch (mode) {
      case 'signUp':
        return 'Create Account';
      case 'forgotPassword':
        return 'Send Reset Link';
      default:
        return 'Sign In';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md glass-panel p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight mb-2">PayChecker</h1>
          <p className="text-slate-500">{getSubtitle()}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`neu-pressed w-full px-4 py-3 border-none focus:ring-0 text-sm placeholder-slate-400 text-slate-700 ${
                formErrors.email ? 'ring-2 ring-red-300' : ''
              }`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {formErrors.email && (
              <p className="mt-1.5 text-xs text-red-500 pl-1">{formErrors.email}</p>
            )}
          </div>

          {/* Password Field (not shown for forgot password) */}
          {mode !== 'forgotPassword' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={`neu-pressed w-full px-4 py-3 border-none focus:ring-0 text-sm placeholder-slate-400 text-slate-700 ${
                  formErrors.password ? 'ring-2 ring-red-300' : ''
                }`}
                placeholder="••••••••"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              />
              {formErrors.password && (
                <p className="mt-1.5 text-xs text-red-500 pl-1">{formErrors.password}</p>
              )}
              {mode === 'signUp' && !formErrors.password && (
                <p className="mt-1.5 text-xs text-slate-400 pl-1">
                  {PASSWORD_REQUIREMENTS.message}
                </p>
              )}
            </div>
          )}

          {/* Confirm Password Field (Sign Up only) */}
          {mode === 'signUp' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className={`neu-pressed w-full px-4 py-3 border-none focus:ring-0 text-sm placeholder-slate-400 text-slate-700 ${
                  formErrors.confirmPassword ? 'ring-2 ring-red-300' : ''
                }`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500 pl-1">{formErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Student Visa Checkbox (Sign Up only) */}
          {mode === 'signUp' && (
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

          {/* Forgot Password Link (Sign In only) */}
          {mode === 'signIn' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => handleModeSwitch('forgotPassword')}
                className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'error'
                ? 'bg-red-50 border border-red-100'
                : 'bg-green-50 border border-green-100'
            }`}>
              {message.title && (
                <p className={`text-sm font-semibold mb-1 ${
                  message.type === 'error' ? 'text-red-700' : 'text-green-700'
                }`}>
                  {message.title}
                </p>
              )}
              <p className={`text-sm ${
                message.type === 'error' ? 'text-red-600' : 'text-green-600'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="neu-btn w-full !bg-indigo-500 !text-white !shadow-none hover:!bg-indigo-600 mt-4 h-12 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </button>
        </form>

        {/* Mode Switch Links */}
        <div className="mt-8 text-center space-y-2">
          {mode === 'forgotPassword' ? (
            <button
              onClick={() => handleModeSwitch('signIn')}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => handleModeSwitch(mode === 'signUp' ? 'signIn' : 'signUp')}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              {mode === 'signUp' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
