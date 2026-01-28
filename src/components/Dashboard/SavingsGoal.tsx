import { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { calculateTotalPay } from '../../utils/calculatePay';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Target, TrendingUp, Edit2, Check, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';

export const SavingsGoal = () => {
  const { t } = useTranslation();
  const { formatCurrency, symbol } = useCurrency();
  const { shifts, jobConfigs, holidays, savingsGoal, updateSavingsGoal } = useScheduleStore();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(savingsGoal.toString());
  }, [savingsGoal]);

  // Calculate average monthly earnings (last 3 months)
  const now = new Date();
  const monthlyEarnings: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    const monthShifts = shifts.filter(s => {
      const d = new Date(s.date);
      return d >= monthStart && d <= monthEnd;
    });
    monthlyEarnings.push(calculateTotalPay(monthShifts, jobConfigs, holidays));
  }

  const avgMonthlyEarnings = monthlyEarnings.reduce((a, b) => a + b, 0) / Math.max(monthlyEarnings.filter(e => e > 0).length, 1);
  
  // Calculate total earnings (all time)
  const totalEarnings = calculateTotalPay(shifts, jobConfigs, holidays);
  
  // Progress calculation
  const progress = savingsGoal > 0 ? Math.min((totalEarnings / savingsGoal) * 100, 100) : 0;
  const remaining = Math.max(savingsGoal - totalEarnings, 0);
  
  // Months to goal prediction
  const monthsToGoal = avgMonthlyEarnings > 0 && remaining > 0 
    ? Math.ceil(remaining / avgMonthlyEarnings)
    : 0;

  const handleSave = () => {
    const value = parseFloat(inputValue) || 0;
    updateSavingsGoal(value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(savingsGoal.toString());
    setIsEditing(false);
  };

  return (
    <div className="neu-flat p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4" />
          {t('savingsGoal.title')}
        </h3>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="neu-icon-btn !p-2"
            title="Edit goal"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} className="neu-icon-btn !p-2 text-emerald-500">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancel} className="neu-icon-btn !p-2 text-rose-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Goal Input / Display */}
      <div className="mb-6">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-400">{symbol}</span>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="text-3xl font-bold text-slate-700 bg-transparent border-b-2 border-indigo-300 focus:border-indigo-500 outline-none w-40"
              placeholder="0"
              autoFocus
            />
          </div>
        ) : (
          <p 
            className={clsx(
              "text-3xl font-bold text-slate-700",
              savingsGoal === 0 && "cursor-pointer hover:text-indigo-500 transition-colors"
            )}
            onClick={() => savingsGoal === 0 && setIsEditing(true)}
          >
            {savingsGoal > 0 ? formatCurrency(savingsGoal) : `${t('savingsGoal.setGoal')} →`}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">{t('savingsGoal.targetAmount')}</p>
      </div>

      {savingsGoal > 0 && (
        <>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500 font-medium">{progress.toFixed(1)}% {t('savingsGoal.complete')}</span>
              <span className="text-slate-400">{formatCurrency(totalEarnings)} / {formatCurrency(savingsGoal)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={clsx(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  progress >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-indigo-400 to-indigo-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t('savingsGoal.remaining')}</p>
              <p className={clsx(
                "text-xl font-bold",
                remaining === 0 ? "text-emerald-500" : "text-slate-700"
              )}>
                {remaining === 0 ? t('savingsGoal.goalReached') : formatCurrency(remaining)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t('savingsGoal.avgMonthly')}</p>
              <p className="text-xl font-bold text-slate-700">{formatCurrency(avgMonthlyEarnings)}</p>
            </div>
          </div>

          {/* Prediction */}
          {monthsToGoal > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-200/30 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t('savingsGoal.prediction')}
                  <span className="font-bold text-indigo-600">
                    {monthsToGoal} {t('savingsGoal.months')}
                  </span>
                </p>
                <p className="text-[10px] text-slate-400">{t('savingsGoal.predictionBase')}</p>
              </div>
            </div>
          )}

          {progress >= 100 && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-50/50 border border-emerald-200/30 text-center">
              <p className="text-lg font-bold text-emerald-600">{t('savingsGoal.congrats')}</p>
              <p className="text-sm text-slate-600">{t('savingsGoal.reachedMsg')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
