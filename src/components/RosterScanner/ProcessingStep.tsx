import { useEffect, useState } from 'react';
import { Loader2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { PROCESSING_MESSAGES, ERROR_MESSAGES } from './constants';

interface ProcessingStepProps {
  error?: string | null;
  errorType?: string | null;
  scanLimit?: number | null;
  onRetry: () => void;
  onBack: () => void;
  onReauth?: () => void;
}

export function ProcessingStep({ error, errorType, scanLimit, onRetry, onBack, onReauth }: ProcessingStepProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (error) return;

    const interval = setInterval(() => {
      setMessageIndex(prev =>
        prev < PROCESSING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [error]);

  const baseErrorInfo = errorType
    ? ERROR_MESSAGES[errorType] || ERROR_MESSAGES.unknown
    : ERROR_MESSAGES.unknown;

  const errorInfo = errorType === 'limit_exceeded' && scanLimit
    ? {
        ...baseErrorInfo,
        description: `You've reached your monthly scan limit (${scanLimit} scans). Limit resets next month.`
      }
    : baseErrorInfo;

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center text-center">
        <div className="p-4 rounded-full bg-red-50 mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>

        <h3 className="text-lg font-bold text-slate-700 mb-2">
          {errorInfo.title}
        </h3>

        <p className="text-sm text-slate-500 mb-6 max-w-xs">
          {error || errorInfo.description}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="neu-btn text-sm"
          >
            Choose Different Image
          </button>

          {errorType === 'auth' && onReauth && (
            <button
              type="button"
              onClick={onReauth}
              className="neu-btn !bg-slate-700 !text-white text-sm"
            >
              Sign In Again
            </button>
          )}

          {errorType !== 'limit_exceeded' && (
            <button
              type="button"
              onClick={onRetry}
              className="neu-btn !bg-indigo-500 !text-white text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center text-center">
      {/* Animated loader */}
      <div className="relative mb-6">
        <div className="p-6 rounded-full neu-pressed">
          <Sparkles className="w-10 h-10 text-indigo-500" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-20 h-20 text-indigo-200 animate-spin" />
        </div>
      </div>

      {/* Processing message */}
      <p className="text-lg font-semibold text-slate-600 mb-2">
        {PROCESSING_MESSAGES[messageIndex]}
      </p>

      <p className="text-sm text-slate-400">
        This usually takes 2-4 seconds
      </p>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-6">
        {PROCESSING_MESSAGES.map((_, idx) => (
          <div
            key={idx}
            className={clsx(
              "w-2 h-2 rounded-full transition-all duration-300",
              idx <= messageIndex ? "bg-indigo-500" : "bg-slate-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}
