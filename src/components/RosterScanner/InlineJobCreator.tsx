import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { JobConfig } from '../../types';
import { dotColorMap, colorOptions } from '../../utils/colorUtils';

interface InlineJobCreatorProps {
  onJobCreated: (job: JobConfig) => void;
  onCancel: () => void;
  suggestedName?: string;
}

const DEFAULT_JOB_CONFIG = {
  defaultHours: { weekday: 8, weekend: 8 },
  hourlyRates: { weekday: 25, saturday: 30, sunday: 35, holiday: 40 },
  rateHistory: [] as any[]
};

export function InlineJobCreator({ onJobCreated, onCancel, suggestedName = '' }: InlineJobCreatorProps) {
  const [jobName, setJobName] = useState(suggestedName);
  const [jobColor, setJobColor] = useState('purple');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!jobName.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const newJob: JobConfig = {
      id: crypto.randomUUID(),
      name: jobName,
      color: jobColor,
      ...DEFAULT_JOB_CONFIG
    };

    onJobCreated(newJob);
  };

  return (
    <div className="neu-pressed p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase">New Job</span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Job name input */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Job Name
        </label>
        <input
          type="text"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          placeholder="e.g., Kitchen Staff"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-100 transition-all"
          autoFocus
        />
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block">
          Color
        </label>
        <div className="flex gap-2 flex-wrap">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setJobColor(color)}
              className={clsx(
                "w-7 h-7 rounded-full transition-all",
                dotColorMap[color],
                jobColor === color
                  ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              )}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!jobName.trim() || isSubmitting}
          className={clsx(
            "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all",
            jobName.trim()
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Create Job
        </button>
      </div>
    </div>
  );
}
