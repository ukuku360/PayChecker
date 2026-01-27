import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { DayCell } from './DayCell';
import { useScheduleStore } from '../../store/useScheduleStore';
import { VisaWarningModal } from './VisaWarningModal';
import { calculateFortnightlyHours } from '../../utils/calculatePay';
import type { Shift } from '../../types';

interface CalendarGridProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  onAddJob?: () => void;
}

export const CalendarGrid = ({ currentDate, onMonthChange, onAddJob }: CalendarGridProps) => {
  const { shifts, removeShift, updateShift, addShift, isStudentVisaHolder, vacationPeriods } = useScheduleStore();
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
        <h2 className="text-2xl font-bold text-slate-700 tracking-tight">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
          <div className="flex items-center gap-4">
            <GlobalSaveButton />
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

      <div className="grid grid-cols-7 border-b border-white/50 bg-slate-100/30">
        {weekDays.map((day) => (
          <div key={day} className="py-4 text-center text-xs font-bold text-slate-500/70 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

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
      
      <VisaWarningModal 
        isOpen={isWarningOpen}
        onClose={() => { setIsWarningOpen(false); setPendingAction(null); }}
        onConfirm={confirmPendingAction}
        overageAmount={overageAmount}
      />
    </div>
  );
};

const GlobalSaveButton = () => {
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
        {status === 'saving' ? 'Syncing...' :
         status === 'saved' ? 'Synced!' :
         status === 'error' ? 'Sync failed' : 'Save'}
      </span>
    </button>
  );
};

