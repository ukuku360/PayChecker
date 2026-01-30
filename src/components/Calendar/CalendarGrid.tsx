import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Save, X, GripVertical, MousePointerClick, Lightbulb, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DayCell } from './DayCell';
import { WeekView } from './WeekView';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useScheduleStore } from '../../store/useScheduleStore';
import { VisaWarningModal } from './VisaWarningModal';
import { MonthYearPicker } from './MonthYearPicker';
import { calculateFortnightlyHours } from '../../utils/calculatePay';
import type { Shift } from '../../types';

const CALENDAR_HINTS_DISMISSED_KEY = 'paychecker_calendar_hints_dismissed';

const CalendarHintBanner = () => {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(true);
  
  useEffect(() => {
    const dismissed = localStorage.getItem(CALENDAR_HINTS_DISMISSED_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(CALENDAR_HINTS_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
            <Lightbulb className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">{t('calendar.tips.title')}</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <GripVertical className="w-3 h-3 text-indigo-400" />
                <span>{t('calendar.tips.dragDrop')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MousePointerClick className="w-3 h-3 text-indigo-400" />
                <span>{t('calendar.tips.doubleClick')}</span>
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-white/50 rounded-lg transition-colors shrink-0"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};

interface CalendarGridProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  onAddJob?: () => void;
}

export const CalendarGrid = ({ currentDate, onMonthChange, onAddJob }: CalendarGridProps) => {
  const { shifts, removeShift, updateShift, addShift, isStudentVisaHolder, vacationPeriods } = useScheduleStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [overageAmount, setOverageAmount] = useState(0);
  const [pendingAction, setPendingAction] = useState<{ type: 'add' | 'update', data: any } | null>(null);

  const checkVisaLimit = (tempShifts: Shift[]) => {
    // We need to check if ANY fortnight period exceeds 48 hours
    // But we only care about periods that include the date of the change?
    // Actually simpler to just check all periods in the relevant range, or just check all periods calculated.
    // calculateFortnightlyHours returns all relevant periods.
    
    const fortnightlyHours = calculateFortnightlyHours(tempShifts);
    
    // Find the max overage
    let maxOverage = 0;
    
    for (const period of fortnightlyHours) {
        if (period.totalHours > 48) {
             // Check if this period is a vacation period
             const periodStart = new Date(period.periodStart);
             const periodEnd = new Date(period.periodStart);
             periodEnd.setDate(periodEnd.getDate() + 13);
             
             const isVacation = vacationPeriods.some(vp => {
                const vpStart = new Date(vp.start);
                const vpEnd = new Date(vp.end);
                return (periodStart <= vpEnd && periodEnd >= vpStart);
             });
             
             if (!isVacation) {
                 maxOverage = Math.max(maxOverage, period.totalHours - 48);
             }
        }
    }
    
    return maxOverage;
  };

  const handleAddShift = (shift: Shift) => {
      if (!isStudentVisaHolder) {
          addShift(shift);
          return;
      }
      
      const tempShifts = [...shifts.filter(s => !(s.date === shift.date && s.type === shift.type)), shift];
      const overage = checkVisaLimit(tempShifts);
      
      if (overage > 0) {
          setOverageAmount(overage);
          setPendingAction({ type: 'add', data: shift });
          setIsWarningOpen(true);
      } else {
          addShift(shift);
      }
  };

  const handleUpdateShift = (id: string, shiftUpdate: Partial<Shift>) => {
      if (!isStudentVisaHolder) {
          updateShift(id, shiftUpdate);
          return;
      }

      // If we are not updating hours, no need to check
      if (shiftUpdate.hours === undefined) {
           updateShift(id, shiftUpdate);
           return;
      }
      
      const tempShifts = shifts.map(s => s.id === id ? { ...s, ...shiftUpdate } : s);
      const overage = checkVisaLimit(tempShifts);
      
      if (overage > 0) {
          setOverageAmount(overage);
          setPendingAction({ type: 'update', data: { id, shiftUpdate } });
          setIsWarningOpen(true);
      } else {
          updateShift(id, shiftUpdate);
      }
  };
  
  const confirmPendingAction = () => {
      if (!pendingAction) return;
      
      if (pendingAction.type === 'add') {
          addShift(pendingAction.data);
      } else if (pendingAction.type === 'update') {
          updateShift(pendingAction.data.id, pendingAction.data.shiftUpdate);
      }
      
      setIsWarningOpen(false);
      setPendingAction(null);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="neu-flat overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b border-white/50 bg-[#e0e5ec]">
        <MonthYearPicker 
          currentDate={currentDate} 
          onMonthChange={onMonthChange} 
        />
          <div className="flex items-center gap-4">
            <GlobalSaveButton />
            <ClearMonthButton monthStart={monthStart} monthEnd={monthEnd} />
            <div className="flex gap-3">
              <button 
                onClick={() => onMonthChange(subMonths(currentDate, 1))}
                className="neu-icon-btn w-10 h-10 !rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onMonthChange(addMonths(currentDate, 1))}
                className="neu-icon-btn w-10 h-10 !rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
      </div>

      <CalendarHintBanner />

      <div className="grid grid-cols-7 border-b border-white/50 bg-slate-100/30">
        {!isMobile && weekDays.map((day) => (
          <div key={day} className="py-4 text-center text-xs font-bold text-slate-500/70 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {isMobile ? (
        <WeekView
          currentDate={currentDate}
          onDateChange={onMonthChange}
          onAddJob={onAddJob}
          onRemoveShift={removeShift}
          onUpdateShift={handleUpdateShift}
          onAddShift={handleAddShift}
        />
      ) : (
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayShifts = shifts.filter(s => s.date === dateKey);

            return (
              <DayCell
                key={day.toISOString()}
                date={day}
                currentMonth={currentDate}
                shifts={dayShifts}
                onRemoveShift={removeShift}
                onUpdateShift={handleUpdateShift}
                onAddShift={handleAddShift}
                onAddJobAddNewJob={onAddJob}
              />
            );
          })}
        </div>
      )}
      
      <VisaWarningModal 
        isOpen={isWarningOpen}
        onClose={() => { setIsWarningOpen(false); setPendingAction(null); }}
        onConfirm={confirmPendingAction}
        overageAmount={overageAmount}
      />
    </div>
  );
};

const ClearMonthButton = ({ monthStart, monthEnd }: { monthStart: Date; monthEnd: Date }) => {
  const { t } = useTranslation();
  const { shifts, removeShiftsInRange } = useScheduleStore();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  const startKey = format(monthStart, 'yyyy-MM-dd');
  const endKey = format(monthEnd, 'yyyy-MM-dd');
  const monthShiftCount = shifts.filter(s => s.date >= startKey && s.date <= endKey).length;

  useEffect(() => {
    setConfirming(false);
  }, [startKey, endKey]);

  useEffect(() => {
    if (confirming && monthShiftCount === 0) {
      setConfirming(false);
    }
  }, [confirming, monthShiftCount]);

  const handleClear = async () => {
    if (clearing || monthShiftCount === 0) return;
    setClearing(true);
    await removeShiftsInRange(startKey, endKey);
    setClearing(false);
    setConfirming(false);
  };

  return (
    <div className="flex items-center">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={monthShiftCount === 0}
          className={clsx(
            "neu-btn flex items-center gap-2 !bg-rose-50 !text-rose-700 border border-rose-100",
            monthShiftCount === 0 ? "opacity-50 !cursor-not-allowed" : "hover:!bg-rose-100"
          )}
          title={t('calendar.deleteMonth')}
        >
          <Trash2 className="w-4 h-4" />
          <span>{t('calendar.deleteMonth')}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className={clsx(
              "px-3 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm",
              clearing && "opacity-70"
            )}
          >
            {clearing ? t('calendar.deleting') : `${t('calendar.deleteAll')} (${monthShiftCount})`}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="neu-icon-btn w-9 h-9 !rounded-lg text-slate-500 hover:text-slate-700"
            aria-label={t('calendar.cancelDelete')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const GlobalSaveButton = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { fetchData } = useScheduleStore();
  
  const handleSave = async () => {
    setStatus('saving');
    try {
      // Trigger a re-fetch to ensure we are in sync with the server
      await fetchData(); 
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Save/Sync failed:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={status === 'saving'}
      className={clsx(
        "neu-btn flex items-center gap-2 transition-all",
        status === 'saved' && "!bg-emerald-100/50 !text-emerald-600 neu-pressed",
        status === 'error' && "!bg-red-100/50 !text-red-600 neu-pressed"
      )}
    >
      <Save className={clsx("w-4 h-4", 
        status === 'saved' ? "text-emerald-600" : 
        status === 'error' ? "text-red-600" : "text-slate-500",
        status === 'saving' && "animate-spin"
      )} />
      <span>
        {status === 'saving' ? t('calendar.syncing') :
         status === 'saved' ? t('calendar.synced') :
         status === 'error' ? t('calendar.syncFailed') : t('calendar.save')}
      </span>
    </button>
  );
};
