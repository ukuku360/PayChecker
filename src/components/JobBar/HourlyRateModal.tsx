import { useState } from 'react';
import type { JobConfig, RateHistoryItem } from '../../types';
import { X, Trash2, Calendar, History, Coffee, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { dotColorMap } from '../../utils/colorUtils';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';

interface HourlyRateModalProps {
  job: JobConfig;
  onClose: () => void;
  onSave: (id: string, config: Partial<JobConfig>) => void;
  onDelete?: (id: string) => void;
  shiftCount?: number;
}

export const HourlyRateModal = ({ job, onClose, onSave, onDelete, shiftCount = 0 }: HourlyRateModalProps) => {
  const { t } = useTranslation();
  const { symbol } = useCurrency();
  const [rates, setRates] = useState(job.hourlyRates);
  const [defaultHours, setDefaultHours] = useState({
      weekday: job.defaultHours?.weekday ?? 0,
      weekend: job.defaultHours?.weekend ?? 0
  });
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rateHistory] = useState<RateHistoryItem[]>(job.rateHistory || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [breakHours, setBreakHours] = useState((job.defaultBreakMinutes ?? 0) / 60);
  const [defaultStartTime, setDefaultStartTime] = useState(job.defaultStartTime || '');
  const [defaultEndTime, setDefaultEndTime] = useState(job.defaultEndTime || '');
  const [breakError, setBreakError] = useState<string | null>(null);

  // Validate break time doesn't exceed shift duration
  const validateBreakTime = (breakHrs: number) => {
    // Fixed: Handle empty string as 0 to avoid coercion issues
    const weekdayHours = typeof defaultHours.weekday === 'number' && defaultHours.weekday > 0 ? defaultHours.weekday : Infinity;
    const weekendHours = typeof defaultHours.weekend === 'number' && defaultHours.weekend > 0 ? defaultHours.weekend : Infinity;
    const minShiftHours = Math.min(weekdayHours, weekendHours);

    if (minShiftHours !== Infinity && breakHrs >= minShiftHours) {
      setBreakError(`Break (${breakHrs}h) cannot exceed shift duration (${minShiftHours}h)`);
      return false;
    }
    setBreakError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateBreakTime(breakHours)) return;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      return; // Invalid date format
    }
    const dateObj = new Date(effectiveDate);
    if (isNaN(dateObj.getTime())) {
      return; // Invalid date
    }

    // Sanitize rates to prevent NaN (convert empty strings to 0)
    const sanitizedRates = {
      weekday: Number(rates.weekday) || 0,
      saturday: Number(rates.saturday) || 0,
      sunday: Number(rates.sunday) || 0,
      holiday: Number(rates.holiday) || 0,
    };

    // Logic:
    // 1. Create a RateHistoryItem for the current inputs
    const newHistoryItem: RateHistoryItem = {
        effectiveDate: effectiveDate,
        rates: sanitizedRates
    };

    // 2. Merge with existing history
    // Remove any existing entry for the same date to avoid duplicates
    const filteredHistory = rateHistory.filter(h => h.effectiveDate !== effectiveDate);
    const updatedHistory = [...filteredHistory, newHistoryItem].sort((a, b) => 
        new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );

    // 3. Determine if the new rate should update the current hourlyRates
    // If we are adding a future rate, we shouldn't update 'hourlyRates' if it represents "current".
    // But if we are adding a past/today rate, we should.
    // Simple heuristic: If the new effective date is <= today, update the main hourlyRates too.
    const today = new Date();
    const isRateEffectiveNow = new Date(effectiveDate) <= today;
    const ratesToSave = isRateEffectiveNow ? sanitizedRates : job.hourlyRates;

    onSave(job.id, {
        hourlyRates: ratesToSave,
        defaultHours: defaultHours,
        rateHistory: updatedHistory,
        defaultBreakMinutes: breakHours > 0 ? breakHours * 60 : undefined,
        defaultStartTime: defaultStartTime || undefined,
        defaultEndTime: defaultEndTime || undefined,
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
      // Fixed: Empty string becomes 0 to prevent NaN in calculations
      if (value === '') {
        setRates(prev => ({ ...prev, [key]: 0 }));
        return;
      }
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        setRates(prev => ({ ...prev, [key]: parsed }));
      }
  };

  const handleHoursChange = (key: keyof typeof defaultHours, value: string) => {
      // Fixed: Empty string becomes 0 to prevent NaN in calculations
      if (value === '') {
        setDefaultHours(prev => ({ ...prev, [key]: 0 }));
        return;
      }
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        setDefaultHours(prev => ({ ...prev, [key]: parsed }));
      }
  };

  const handleHistoryItemClick = (item: RateHistoryItem) => {
      setRates(item.rates);
      setEffectiveDate(item.effectiveDate);
      setShowHistory(false);
  };

  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-slate-900";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div 
        className="glass-panel w-full max-w-md mx-4 overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className={clsx("w-3 h-3 rounded-full shadow-inner", dotColorMap[job.color] || 'bg-slate-500')} />
            <div>
                <h2 className="text-lg font-bold text-slate-700">{job.name} {t('hourlyRateModal.settings')}</h2>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{t('hourlyRateModal.configureRates')}</p>
            </div>
          </div>
          <button onClick={onClose} className="neu-icon-btn w-8 h-8 !rounded-lg !p-0" aria-label="Close modal">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Default Hours Configuration */}
          <div className="neu-flat p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500"><History className="w-3.5 h-3.5" /></div>
                <h3 className="text-sm font-bold text-slate-700">{t('hourlyRateModal.defaultDuration')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('hourlyRateModal.weekday')}</label>
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
                    <label className={labelClass}>{t('hourlyRateModal.weekend')}</label>
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
          
           {/* Default Times Configuration */}
           <div className="neu-flat p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500"><History className="w-3.5 h-3.5" /></div>
                <h3 className="text-sm font-bold text-slate-700">{t('hourlyRateModal.defaultTimes')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('hourlyRateModal.startTime')}</label>
                    <input
                      type="time"
                      value={defaultStartTime}
                      onChange={(e) => setDefaultStartTime(e.target.value)}
                      className={clsx(inputClass, "pl-3 bg-white/50 border-white/50 shadow-sm")}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('hourlyRateModal.endTime')}</label>
                    <input
                      type="time"
                      value={defaultEndTime}
                      onChange={(e) => setDefaultEndTime(e.target.value)}
                      className={clsx(inputClass, "pl-3 bg-white/50 border-white/50 shadow-sm")}
                    />
                  </div>
              </div>
          </div>

          {/* Break Time Configuration */}
          <div className="neu-flat p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500"><Coffee className="w-3.5 h-3.5" /></div>
                <h3 className="text-sm font-bold text-slate-700">{t('hourlyRateModal.unpaidBreak')}</h3>
                <div className="group relative ml-auto">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <p className="font-medium mb-1">{t('hourlyRateModal.breakTooltipTitle')}</p>
                    <p className="text-slate-300" dangerouslySetInnerHTML={{ __html: t('hourlyRateModal.breakTooltipExample').replace('7.5h', '<strong>7.5h</strong>') }} />
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('hourlyRateModal.breakTime')}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={breakHours}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setBreakHours(val);
                      validateBreakTime(val);
                    }}
                    className={clsx(inputClass, "pl-3 bg-white/50 border-white/50 shadow-sm", breakError && "border-rose-300 focus:ring-rose-500")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">hrs</span>
                </div>
                {breakError ? (
                  <p className="text-[10px] text-rose-500 mt-1.5 font-medium">{breakError}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {breakHours > 0
                      ? t('hourlyRateModal.breakDeductionActive', { hours: breakHours })
                      : t('hourlyRateModal.noBreakDeduction')}
                  </p>
                )}
              </div>
          </div>

          {/* Rates Configuration */}
          <div className="neu-flat p-4 rounded-xl space-y-4">
             <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-500"><Calendar className="w-3.5 h-3.5" /></div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-700">{t('hourlyRateModal.hourlyRates')}</h3>
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                              <p className="font-medium mb-2">{t('hourlyRateModal.penaltyRatesTooltipTitle')}</p>
                              <div className="space-y-1 text-slate-300">
                                <p>{t('hourlyRateModal.weekday')}: <strong>{symbol}25</strong></p>
                                <p>{t('hourlyRateModal.saturday')} (1.25x): <strong>{symbol}31.25</strong></p>
                                <p>{t('hourlyRateModal.sunday')} (1.5x): <strong>{symbol}37.50</strong></p>
                                <p>{t('hourlyRateModal.holiday')} (2.5x): <strong>{symbol}62.50</strong></p>
                              </div>
                              <p className="text-slate-400 mt-2 text-[10px]">{t('hourlyRateModal.penaltyRatesTooltipNote')}</p>
                              <div className="absolute -top-1.5 left-4 w-3 h-3 bg-slate-800 rotate-45" />
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase">{t('hourlyRateModal.effectiveDate')}</span>
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
                    { label: t('hourlyRateModal.weekday'), key: 'weekday' },
                    { label: t('hourlyRateModal.saturday'), key: 'saturday' },
                    { label: t('hourlyRateModal.sunday'), key: 'sunday' },
                    { label: t('hourlyRateModal.holiday'), key: 'holiday' }
                ].map((item) => (
                    <div key={item.key}>
                    <label className={labelClass}>{item.label}</label>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium group-focus-within:text-emerald-500 transition-colors">{symbol}</span>
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
                    <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setShowHistory(!showHistory)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 flex items-center justify-center gap-2 transition-all"
                      >
                          <History className="w-3.5 h-3.5" />
                          {showHistory ? t('hourlyRateModal.hideHistory') : t('hourlyRateModal.viewHistory', { count: rateHistory.length })}
                      </button>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-slate-400 cursor-help" />
                        <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <p className="font-medium mb-1">{t('hourlyRateModal.rateHistoryTooltipTitle')}</p>
                          <p className="text-slate-300">{t('hourlyRateModal.rateHistoryTooltipDesc')}</p>
                          <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45" />
                        </div>
                      </div>
                    </div>
                    
                    {showHistory && (
                        <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                             {rateHistory.map((h) => (
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
                                        <span className="text-[10px] text-slate-400">{t('hourlyRateModal.weekday')}: {symbol}{h.rates.weekday}</span>
                                    </div>
                                    {effectiveDate === h.effectiveDate && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{t('hourlyRateModal.activeEdit')}</span>}
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
                  <span className="font-bold">{t('hourlyRateModal.deleteJob')}</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  {shiftCount > 0 && (
                    <p className="text-xs text-rose-600 font-medium">
                      {t('hourlyRateModal.deleteShiftsWarning', { count: shiftCount })}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm active:translate-y-0.5"
                    >
                      {shiftCount > 0 ? t('hourlyRateModal.deleteAll') : t('hourlyRateModal.confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="neu-btn !bg-indigo-500 !text-white !shadow-lg !shadow-indigo-500/20 hover:!bg-indigo-600 hover:!shadow-indigo-500/30 flex items-center gap-2 px-6"
                >
                  {t('hourlyRateModal.saveChanges')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
