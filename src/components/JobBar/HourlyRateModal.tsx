import { useState } from 'react';
import type { JobConfig } from '../../types';
import { X, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { dotColorMap } from '../../utils/colorUtils';

interface HourlyRateModalProps {
  job: JobConfig;
  onClose: () => void;
  onSave: (id: string, config: Partial<JobConfig>) => void;
  onDelete?: (id: string) => void;
}

export const HourlyRateModal = ({ job, onClose, onSave, onDelete }: HourlyRateModalProps) => {
  const [rates, setRates] = useState(job.hourlyRates);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onSave(job.id, { hourlyRates: rates });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(job.id);
      onClose();
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white";
  const labelClass = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className={clsx("w-3 h-3 rounded-full", dotColorMap[job.color] || 'bg-slate-500')} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{job.name} Hourly Rates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Set hourly rates in AUD ($) for different day types:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Weekday</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rates.weekday}
                  onChange={(e) => setRates({ ...rates, weekday: parseFloat(e.target.value) || 0 })}
                  className={clsx(inputClass, "pl-7")}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Saturday</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rates.saturday}
                  onChange={(e) => setRates({ ...rates, saturday: parseFloat(e.target.value) || 0 })}
                  className={clsx(inputClass, "pl-7")}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Sunday</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rates.sunday}
                  onChange={(e) => setRates({ ...rates, sunday: parseFloat(e.target.value) || 0 })}
                  className={clsx(inputClass, "pl-7")}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Holiday</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rates.holiday}
                  onChange={(e) => setRates({ ...rates, holiday: parseFloat(e.target.value) || 0 })}
                  className={clsx(inputClass, "pl-7")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30 transition-colors h-[72px]">
          {onDelete ? (
            <div className="flex items-center">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Job
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : <div />}
          
          <div className="flex gap-3">
            {!showDeleteConfirm && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
