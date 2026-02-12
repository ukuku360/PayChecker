import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { dotColorMap, colorOptions } from '../../utils/colorUtils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { JobConfig } from '../../types';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: JobConfig) => void;
  existingJobIds?: string[];
  initialName?: string;
  zIndex?: number;
}

type JobColor = (typeof colorOptions)[number];

export function AddJobModal({ isOpen, onClose, onAdd, existingJobIds = [], initialName, zIndex }: AddJobModalProps) {
  const [newJobName, setNewJobName] = useState('');
  const [newJobColor, setNewJobColor] = useState<JobColor>('purple');
  const [defaultWeekdayHours, setDefaultWeekdayHours] = useState<string | number>(7.5);
  const [defaultWeekendHours, setDefaultWeekendHours] = useState<string | number>(7.5);
  const [weekdayRate, setWeekdayRate] = useState<string | number>(25);
  const [saturdayRate, setSaturdayRate] = useState<string | number>(30);
  const [sundayRate, setSundayRate] = useState<string | number>(35);
  const [holidayRate, setHolidayRate] = useState<string | number>(40);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Pre-fill name when modal opens with initialName
  useEffect(() => {
    if (isOpen && initialName) {
      setNewJobName(initialName);
    }
    if (isOpen && !initialName) {
      setNewJobName('');
    }
  }, [isOpen, initialName]);

  // Check for duplicate job ID
  const checkDuplicate = (name: string): boolean => {
    const newId = name.toUpperCase().replace(/\s+/g, '_');
    if (existingJobIds.includes(newId)) {
      setDuplicateError(`A job with ID "${newId}" already exists`);
      return true;
    }
    setDuplicateError(null);
    return false;
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAddJob = () => {
    if (!newJobName.trim()) return;
    if (checkDuplicate(newJobName)) return;

    const newJob: JobConfig = {
      id: newJobName.toUpperCase().replace(/\s+/g, '_'),
      name: newJobName,
      color: newJobColor,
      defaultHours: {
        weekday: Number(defaultWeekdayHours) || 0,
        weekend: Number(defaultWeekendHours) || 0,
      },
      hourlyRates: {
        weekday: Number(weekdayRate) || 25,
        saturday: Number(saturdayRate) || 30,
        sunday: Number(sundayRate) || 35,
        holiday: Number(holidayRate) || 40,
      },
      rateHistory: [],
    };

    onAdd(newJob);
  };

  // Keyboard navigation for color picker
  const handleColorKeyDown = (e: React.KeyboardEvent, color: JobColor) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setNewJobColor(color);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = colorOptions.indexOf(color);
      const nextIndex = (currentIndex + 1) % colorOptions.length;
      document.getElementById(`color-btn-${colorOptions[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = colorOptions.indexOf(color);
      const prevIndex = (currentIndex - 1 + colorOptions.length) % colorOptions.length;
      document.getElementById(`color-btn-${colorOptions[prevIndex]}`)?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={clsx(
        "fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{ zIndex: zIndex ?? 50 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={clsx(
          "glass-panel w-full max-w-sm mx-4 overflow-hidden transform transition-all duration-300 shadow-2xl max-h-[90vh] flex flex-col",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
      >
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <h2 id="modal-title" className="text-lg font-bold text-slate-700">Add New Job</h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose} 
            className="neu-icon-btn w-10 h-10 !rounded-lg !p-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <label 
              htmlFor="jobName"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block pl-1"
            >
              Job Name
            </label>
            <input
              id="jobName"
              type="text"
              name="jobName" // meaningful name
              autoComplete="off" // generic field
              placeholder="e.g., Tutoring"
              value={newJobName}
              onChange={(e) => {
                setNewJobName(e.target.value);
                if (duplicateError) checkDuplicate(e.target.value);
              }}
              onBlur={() => checkDuplicate(newJobName)}
              className={clsx(
                "neu-pressed w-full px-4 py-3 border-none focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm placeholder-slate-400 text-slate-700 rounded-xl transition-all",
                duplicateError && "ring-2 ring-rose-400"
              )}
              autoFocus={!isMobile}
            />
            {duplicateError && (
              <p className="text-xs text-rose-500 mt-1 pl-1 font-medium animate-in slide-in-from-top-1">{duplicateError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="weekdayHours" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
                    Def. Weekday
                </label>
                <div className="relative">
                    <input
                        id="weekdayHours"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        value={defaultWeekdayHours}
                        onChange={(e) => setDefaultWeekdayHours(e.target.value)}
                        onBlur={() => {
                            if (defaultWeekdayHours === '') setDefaultWeekdayHours(0);
                        }}
                        className="neu-pressed w-full px-4 py-2.5 border-none focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm text-slate-700 rounded-xl"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">hrs</span>
                </div>
              </div>
              <div>
                <label htmlFor="weekendHours" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
                    Def. Weekend
                </label>
                <div className="relative">
                    <input
                        id="weekendHours"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        value={defaultWeekendHours}
                        onChange={(e) => setDefaultWeekendHours(e.target.value)}
                         onBlur={() => {
                            if (defaultWeekendHours === '') setDefaultWeekendHours(0);
                        }}
                        className="neu-pressed w-full px-4 py-2.5 border-none focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm text-slate-700 rounded-xl"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">hrs</span>
                </div>
              </div>
          </div>
          
          {/* Hourly Rates */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
              Hourly Rates
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'weekdayRate', label: 'Weekday', value: weekdayRate, setter: setWeekdayRate },
                { id: 'saturdayRate', label: 'Saturday', value: saturdayRate, setter: setSaturdayRate },
                { id: 'sundayRate', label: 'Sunday', value: sundayRate, setter: setSundayRate },
                { id: 'holidayRate', label: 'Holiday', value: holidayRate, setter: setHolidayRate },
              ] as const).map(({ id, label, value, setter }) => (
                <div key={id}>
                  <label htmlFor={id} className="text-xs text-slate-400 mb-1 block pl-1">
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      onBlur={() => { if (value === '') setter(0); }}
                      className="neu-pressed w-full pl-7 pr-10 py-2 border-none focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm text-slate-700 rounded-xl"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
              Color
            </label>
            <div className="flex gap-3 flex-wrap p-2" role="radiogroup" aria-label="Job Color">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  id={`color-btn-${color}`}
                  type="button"
                  role="radio"
                  aria-checked={newJobColor === color}
                  aria-label={`Select ${color} color`}
                  onClick={() => setNewJobColor(color)}
                  onKeyDown={(e) => handleColorKeyDown(e, color)}
                  className={clsx(
                    "w-10 h-10 rounded-full transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400",
                    dotColorMap[color],
                    newJobColor === color 
                      ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-lg' 
                      : 'opacity-80 hover:opacity-100 hover:scale-105'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/30 flex justify-end gap-3 bg-white/10">
          <button 
            onClick={onClose} 
            className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddJob} 
            disabled={!newJobName.trim()}
            className={clsx(
              "neu-btn !bg-indigo-500 !text-white !shadow-none hover:!bg-indigo-600 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2",
              !newJobName.trim() && "opacity-50 cursor-not-allowed"
            )}
          >
            Add Job
          </button>
        </div>
      </div>
    </div>
  );
}
