import { useEffect, useState } from 'react';
import { Sparkles, AlertCircle, RotateCcw, Check, ScanLine, FileText, BrainCircuit, Table, CalendarClock } from 'lucide-react';
import { clsx } from 'clsx';
import { ERROR_MESSAGES } from './constants';

interface ProcessingStepProps {
  error?: string | null;
  errorType?: string | null;
  scanLimit?: number | null;
  onRetry: () => void;
  onBack: () => void;
  onReauth?: () => void;
}

const PROCESS_STEPS = [
  { icon: BrainCircuit, label: 'Initializing AI Vision Engine...', duration: 1500 },
  { icon: FileText, label: 'Analyzing Image Context...', duration: 1200 },
  { icon: Table, label: 'Detecting Roster Grid...', duration: 1500 },
  { icon: ScanLine, label: 'Extracting Shift Data...', duration: 2000 },
  { icon: CalendarClock, label: 'Finalizing Schedule...', duration: 1000 },
];

export function ProcessingStep({ error, errorType, scanLimit, onRetry, onBack, onReauth }: ProcessingStepProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (error) return;

    let currentStep = 0;
    let timeoutId: NodeJS.Timeout;

    const runStep = () => {
      if (currentStep >= PROCESS_STEPS.length - 1) return;

      timeoutId = setTimeout(() => {
        currentStep++;
        setActiveStep(currentStep);
        runStep();
      }, PROCESS_STEPS[currentStep].duration);
    };

    runStep();

    return () => clearTimeout(timeoutId);
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
      <div className="p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-4 rounded-full bg-red-50 mb-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>

        <h3 className="text-lg font-bold text-slate-700 mb-2">
          {errorInfo.title}
        </h3>

        <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
          {error || errorInfo.description}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="neu-btn text-sm px-4 py-2.5"
          >
            Choose Different Image
          </button>

          {errorType === 'auth' && onReauth && (
            <button
              type="button"
              onClick={onReauth}
              className="neu-btn !bg-slate-700 !text-white text-sm px-4 py-2.5"
            >
              Sign In Again
            </button>
          )}

          {errorType !== 'limit_exceeded' && (
            <button
              type="button"
              onClick={onRetry}
              className="neu-btn !bg-indigo-500 !text-white text-sm flex items-center gap-2 px-4 py-2.5"
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
    <div className="p-8 flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Cute Scanning Animation */}
      <div className="relative mb-8 group">
        <div className="relative w-24 h-32 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
             {/* Document lines */}
            <div className="space-y-2 w-full px-4 opacity-30">
                <div className="h-2 bg-slate-400 rounded-full w-3/4"></div>
                <div className="h-2 bg-slate-400 rounded-full w-full"></div>
                <div className="h-2 bg-slate-400 rounded-full w-5/6"></div>
                <div className="h-2 bg-slate-400 rounded-full w-full"></div>
                <div className="h-2 bg-slate-400 rounded-full w-4/5"></div>
            </div>

            {/* Scanning beam */}
            <div className="absolute inset-x-0 h-[2px] bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-[scan_2s_ease-in-out_infinite]" />
        </div>
        
        {/* Magic sparkles */}
        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-pulse" />
        <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-indigo-400 animate-bounce delay-700" />
      </div>

      {/* Sequential Progress List */}
      <div className="w-full space-y-3">
        {PROCESS_STEPS.map((step, idx) => {
          const isActive = idx === activeStep;
          const isCompleted = idx < activeStep;
          const StepIcon = step.icon;

          return (
            <div 
              key={idx}
              className={clsx(
                "flex items-center gap-3 p-2 rounded-lg transition-all duration-500",
                isActive ? "bg-indigo-50 scale-105 shadow-sm translate-x-1" : "opacity-50 grayscale"
              )}
            >
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                isCompleted ? "bg-emerald-500" : isActive ? "bg-indigo-500" : "bg-slate-200"
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <StepIcon className={clsx("w-4 h-4 text-white", isActive && "animate-pulse")} />
                )}
              </div>
              
              <span className={clsx(
                "text-sm font-medium transition-colors",
                isActive ? "text-indigo-700" : "text-slate-500",
                isCompleted && "text-slate-400 line-through"
              )}>
                {step.label}
              </span>

              {isActive && (
                <div className="ml-auto w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
