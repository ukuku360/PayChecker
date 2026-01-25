import { useState } from 'react';
import type { JobConfig, RateHistoryItem } from '../../types';
import { X, Trash2, Calendar, History, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { dotColorMap } from '../../utils/colorUtils';
import { format } from 'date-fns';

interface HourlyRateModalProps {
  job: JobConfig;
  onClose: () => void;
  onSave: (id: string, config: Partial<JobConfig>) => void;
  onDelete?: (id: string) => void;
}

export const HourlyRateModal = ({ job, onClose, onSave, onDelete }: HourlyRateModalProps) => {
  const [rates, setRates] = useState(job.hourlyRates);
  const [defaultHours, setDefaultHours] = useState({
      weekday: job.defaultHours?.weekday ?? 0,
      weekend: job.defaultHours?.weekend ?? 0
  });
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rateHistory, setRateHistory] = useState<RateHistoryItem[]>(job.rateHistory || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = () => {
    // Logic:
    // 1. Create a RateHistoryItem for the current inputs
    const newHistoryItem: RateHistoryItem = {
        effectiveDate: effectiveDate,
        rates: rates
    };

    // 2. Merge with existing history
    // Remove any existing entry for the same date to avoid duplicates
    const filteredHistory = rateHistory.filter(h => h.effectiveDate !== effectiveDate);
    const updatedHistory = [...filteredHistory, newHistoryItem].sort((a, b) => 
        new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );

    // 3. Determine the "current" rates to display on cards (the one effective as of today)
    // We can just trust the calculated logic, but for the 'hourlyRates' field which is used as fallback/display:
    // If exact match for today exists, use it. Else find latest <= today.
    const today = new Date();
    const currentEffective = updatedHistory.find(h => new Date(h.effectiveDate) <= today) || updatedHistory[0]; // fallback to latest future if no past? or oldest? current logic uses latest <= date. 

    // If we are adding a future rate, we shouldn't update 'hourlyRates' if it represents "current".
    // But if we are adding a past/today rate, we should.
    // Let's rely on the store's "hourlyRates" being the "currently active default".
    // Simple heuristic: If the new effective date is <= today, update the main hourlyRates too.
    const isRateEffectiveNow = new Date(effectiveDate) <= today;
    const ratesToSave = isRateEffectiveNow ? rates : job.hourlyRates;

    onSave(job.id, { 
        hourlyRates: ratesToSave,
        defaultHours: defaultHours,
        rateHistory: updatedHistory,
    });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(job.id);
      onClose();
    }
  };

  const handleRateChange = (key: keyof typeof rates, value: string) => {
      setRates(prev => ({ ...prev, [key]: value === '' ? '' : parseFloat(value) }));
  };
  
  const handleHoursChange = (key: keyof typeof defaultHours, value: string) => {
      setDefaultHours(prev => ({ ...prev, [key]: value === '' ? '' : parseFloat(value) }));
  };

  const handleHistoryItemClick = (item: RateHistoryItem) => {
      setRates(item.rates);
      setEffectiveDate(item.effectiveDate);
      setShowHistory(false);
  };

  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-slate-900";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-md mx-4 overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className={clsx("w-3 h-3 rounded-full shadow-inner", dotColorMap[job.color] || 'bg-slate-500')} />
            <div>
                <h2 className="text-lg font-bold text-slate-700">{job.name} Settings</h2>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Configure rates & defaults</p>
            </div>
          </div>
          <button onClick={onClose} className="neu-icon-btn w-8 h-8 !rounded-lg !p-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Default Hours Configuration */}
          <div className="neu-flat p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500"><History className="w-3.5 h-3.5" /></div>
                <h3 className="text-sm font-bold text-slate-700">Default Duration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Weekday</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={defaultHours.weekday}
                        onChange={(e) => handleHoursChange('weekday', e.target.value)}
                        className={clsx(inputClass, "pl-3 bg-white/50 border-white/50 shadow-sm")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">hrs</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Weekend</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={defaultHours.weekend}
                        onChange={(e) => handleHoursChange('weekend', e.target.value)}
                        className={clsx(inputClass, "pl-3 bg-white/50 border-white/50 shadow-sm")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">hrs</span>
                    </div>
                  </div>
              </div>
          </div>

          {/* Rates Configuration */}
          <div className="neu-flat p-4 rounded-xl space-y-4">
             <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-500"><Calendar className="w-3.5 h-3.5" /></div>
                    <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-slate-700">Hourly Rates</h3>
                        <span className="text-[10px] text-slate-400 font-medium uppercase">Effective Date</span>
                    </div>
                </div>
                <input 
                    type="date" 
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="text-xs border border-emerald-100 bg-white px-2 py-1 rounded-md text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer hover:bg-emerald-50/30 transition-colors shadow-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Weekday', key: 'weekday' },
                    { label: 'Saturday', key: 'saturday' },
                    { label: 'Sunday', key: 'sunday' },
                    { label: 'Holiday', key: 'holiday' }
                ].map((item) => (
                    <div key={item.key}>
                    <label className={labelClass}>{item.label}</label>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium group-focus-within:text-emerald-500 transition-colors">$</span>
                        <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={rates[item.key as keyof typeof rates]}
                        onChange={(e) => handleRateChange(item.key as keyof typeof rates, e.target.value)}
                        className={clsx(inputClass, "pl-7 bg-white/50 border-white/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500/20")}
                        />
                    </div>
                    </div>
                ))}
              </div>

               {/* History Expand Toggle */}
               {rateHistory.length > 0 && (
                 <div className="pt-2">
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 flex items-center justify-center gap-2 transition-all"
                    >
                        <History className="w-3.5 h-3.5" />
                        {showHistory ? 'Hide Rate History' : `View Rate History (${rateHistory.length})`}
                    </button>
                    
                    {showHistory && (
                        <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                             {rateHistory.map((h, i) => (
                                 <button
                                    key={h.effectiveDate}
                                    onClick={() => handleHistoryItemClick(h)}
                                    className={clsx(
                                        "w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all group",
                                        effectiveDate === h.effectiveDate 
                                            ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200" 
                                            : "bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30"
                                    )}
                                 >
                                    <div className="flex flex-col">
                                        <span className={clsx("text-xs font-bold", effectiveDate === h.effectiveDate ? "text-emerald-700" : "text-slate-700")}>
                                            {format(new Date(h.effectiveDate), 'MMM d, yyyy')}
                                        </span>
                                        <span className="text-[10px] text-slate-400">Weekday: ${h.rates.weekday}</span>
                                    </div>
                                    {effectiveDate === h.effectiveDate && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Active Edit</span>}
                                 </button>
                             ))}
                        </div>
                    )}
                 </div>
               )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/30 flex justify-between items-center bg-white/40 h-[72px]">
          {onDelete ? (
            <div className="flex items-center">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-bold">Delete Job</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm active:translate-y-0.5"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
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
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="neu-btn !bg-indigo-500 !text-white !shadow-lg !shadow-indigo-500/20 hover:!bg-indigo-600 hover:!shadow-indigo-500/30 flex items-center gap-2 px-6"
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
