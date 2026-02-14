import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Home, Plane, GraduationCap, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthModalStore } from '../../store/useAuthModalStore';
import { useViewportHeight } from '../../hooks/useViewportHeight';
import {
  getAuthErrorMessage,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  PASSWORD_REQUIREMENTS
} from './authErrors';
import type { AustraliaVisaType } from '../../types';

// Visa type options for Australia (mirrored from ProfileModal)
const VISA_OPTIONS: Array<{
  value: AustraliaVisaType;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Home;
}> = [
  {
    value: 'domestic',
    labelKey: 'profile.visaType.domestic',
    descriptionKey: 'profile.visaType.domesticDesc',
    icon: Home,
  },
  {
    value: 'working_holiday',
    labelKey: 'profile.visaType.workingHoliday',
    descriptionKey: 'profile.visaType.workingHolidayDesc',
    icon: Plane,
  },
  {
    value: 'student_visa',
    labelKey: 'profile.visaType.studentVisa',
    descriptionKey: 'profile.visaType.studentVisaDesc',
    icon: GraduationCap,
  },
];


type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function AuthModal() {
  const { t } = useTranslation();
  const { isOpen, closeAuthModal, returnMessage, executePendingAction } = useAuthModalStore();
  const { viewportHeight } = useViewportHeight();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [visaType, setVisaType] = useState<AustraliaVisaType>('domestic');
  // Removed selectedCountry as app is AU-only
  const [message, setMessage] = useState<{ type: 'error' | 'success'; title?: string; text: string } | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // No longer needed as selectedCountry is always 'AU'

  // Listen for successful auth to execute pending action
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && isOpen) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          executePendingAction();
          // If no pending action was executed (executePendingAction closes modal if action exists),
          // close it manually for a "natural" experience
          if (isOpen) {
            closeAuthModal();
          }
        }, 100);
      }
    });
    return () => subscription.unsubscribe();
  }, [executePendingAction, isOpen, closeAuthModal]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form state when modal closes
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setMode('signIn');
      setMessage(null);
      setFormErrors({});
    }
  }, [isOpen]);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setMessage(null);
    setFormErrors({});
    if (newMode !== 'signUp') {
      setConfirmPassword('');
    }
  };

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
          title: t('auth.passwordResetSent'),
          text: t('auth.checkInbox')
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

        // Create profile with country and optional student visa
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
          });
          if (profileError && import.meta.env.DEV) {
            console.error('Profile creation error:', profileError);
          }
        }

        setMessage({
          type: 'success',
          title: t('auth.registrationSuccess'),
          text: t('auth.verifyEmail')
        });
        handleModeSwitch('signIn');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Auth state change listener will handle executePendingAction
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
        return t('auth.signUpSubtitle');
      case 'forgotPassword':
        return t('auth.forgotPasswordSubtitle');
      default:
        return t('auth.signInSubtitle');
    }
  };

  const getButtonText = () => {
    if (loading) return t('auth.processing');
    switch (mode) {
      case 'signUp':
        return t('auth.createAccount');
      case 'forgotPassword':
        return t('auth.sendResetLink');
      default:
        return t('auth.signIn');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200"
      style={{ height: viewportHeight || '100vh' }}
    >
      <div
        className="glass-panel w-full max-w-md mx-4 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 overflow-y-auto"
        style={{ maxHeight: viewportHeight ? `${viewportHeight - 32}px` : '90vh' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg neu-pressed">
              <X className="w-5 h-5 text-indigo-500 opacity-0 absolute" /> {/* Placeholder for icon alignment if needed */}
              <div className="w-5 h-5 flex items-center justify-center font-bold text-indigo-500">
                {mode === 'signIn' ? '→' : mode === 'signUp' ? '+' : '?'}
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-700">
              {mode === 'signIn' ? t('auth.signIn') : mode === 'signUp' ? t('auth.signUp') : t('auth.resetPassword')}
            </h2>
          </div>
          <button
            onClick={closeAuthModal}
            className="neu-icon-btn w-8 h-8 !rounded-lg !p-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* Return message if present */}
          {returnMessage && (
            <div className="mb-6 p-3 bg-indigo-50 rounded-xl text-sm text-indigo-700 font-medium border border-indigo-100">
              {returnMessage}
            </div>
          )}

          <div className="mb-6">
            <p className="text-slate-500 text-sm">{getSubtitle()}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Country selector removed - App is AU only */}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">
                {t('common.email')}
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
                  {t('common.password')}
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
                  {t('auth.confirmPassword')}
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

            {/* Visa Type Selection (Sign Up only) */}
            {mode === 'signUp' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-1">
                  {t('profile.visaType.title')}
                </label>
                <div className="space-y-2">
                  {VISA_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = visaType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVisaType(option.value)}
                        className={`w-full px-4 py-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-semibold">{t(option.labelKey)}</span>
                          <span className="text-[10px] text-slate-500 leading-tight">{t(option.descriptionKey)}</span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
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
                  {t('auth.forgotPassword')}
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
          <div className="mt-6 text-center space-y-2">
            {mode === 'forgotPassword' ? (
              <button
                onClick={() => handleModeSwitch('signIn')}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                {t('auth.backToSignIn')}
              </button>
            ) : (
              <button
                onClick={() => handleModeSwitch(mode === 'signUp' ? 'signIn' : 'signUp')}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                {mode === 'signUp' ? t('auth.alreadyHaveAccount') : t('auth.needAccount')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
