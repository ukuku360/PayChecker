import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { dotColorMap, colorOptions } from '../../utils/colorUtils';
import type { JobConfig } from '../../types';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: JobConfig) => void;
}

export function AddJobModal({ isOpen, onClose, onAdd }: AddJobModalProps) {
  const [newJobName, setNewJobName] = useState('');
  const [newJobColor, setNewJobColor] = useState('purple');
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setNewJobName('');
      setNewJobColor('purple');
    } else {
      const timer = setTimeout(() => setIsRendered(false), 200); // Wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAddJob = () => {
    if (!newJobName.trim()) return;

    const newJob: JobConfig = {
      id: newJobName.toUpperCase().replace(/\s+/g, '_'),
      name: newJobName,
      color: newJobColor,
      defaultHours: {
        weekday: 7.5,
        weekend: 7.5,
      },
      hourlyRates: {
        weekday: 25,
        saturday: 30,
        sunday: 35,
        holiday: 40,
      },
    };

    onAdd(newJob);
  };

  if (!isRendered) return null;

  return (
    <div 
      className={clsx(
        "fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div 
        className={clsx(
          "glass-panel w-full max-w-sm mx-4 overflow-hidden transform transition-all duration-300",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <h2 className="text-lg font-bold text-slate-700">Add New Job</h2>
          <button 
            onClick={onClose} 
            className="neu-icon-btn w-8 h-8 !rounded-lg !p-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
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
              onChange={(e) => setNewJobName(e.target.value)}
              className="neu-pressed w-full px-4 py-3 border-none focus:ring-0 text-sm placeholder-slate-400 text-slate-700"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block pl-1">
              Color
            </label>
            <div className="flex gap-3 flex-wrap p-2" role="radiogroup" aria-label="Job Color">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={newJobColor === color}
                  aria-label={`Select ${color}`}
                  onClick={() => setNewJobColor(color)}
                  className={clsx(
                    "w-8 h-8 rounded-full transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400",
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
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddJob} 
            disabled={!newJobName.trim()}
            className={clsx(
              "neu-btn !bg-indigo-500 !text-white !shadow-none hover:!bg-indigo-600",
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
