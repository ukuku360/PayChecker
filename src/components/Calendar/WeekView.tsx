import { startOfWeek, addDays, format, addWeeks, subWeeks, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DayCell } from './DayCell';
import { useScheduleStore } from '../../store/useScheduleStore';
import type { Shift } from '../../types';

interface WeekViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAddJob?: () => void;
  onRemoveShift: (id: string) => void;
  onUpdateShift: (id: string, shift: Partial<Shift>) => void;
  onAddShift: (shift: Shift) => void;
}

export const WeekView = ({
  currentDate,
  onDateChange,
  onAddJob,
  onRemoveShift,
  onUpdateShift,
  onAddShift
}: WeekViewProps) => {
  const { shifts } = useScheduleStore();
  const { t } = useTranslation();
  
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => onDateChange(subWeeks(currentDate, 1));
  const handleNextWeek = () => onDateChange(addWeeks(currentDate, 1));

  return (
    <div className="flex flex-col h-full bg-[#e0e5ec]">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/50 bg-[#e0e5ec] sticky top-0 z-10">
        <button 
          onClick={handlePrevWeek}
          className="neu-icon-btn w-10 h-10 !rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-700">
            {format(weekStart, 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </h3>
        </div>

        <button 
          onClick={handleNextWeek}
          className="neu-icon-btn w-10 h-10 !rounded-lg"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Days List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 pb-20">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayShifts = shifts.filter(s => s.date === dateKey);
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div 
              key={day.toISOString()} 
              className={`rounded-xl overflow-hidden transition-all ${
                isToday ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#e0e5ec]' : ''
              } ${!isCurrentMonth ? 'opacity-60' : ''}`}
            >
              {/* Custom Mobile Day Header */}
              <div className="bg-slate-50 border-b border-slate-100 p-2 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 text-lg">{format(day, 'd')}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{format(day, 'EEE')}</span>
                </div>
                {isToday && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                        {t('calendar.today', 'Today')}
                    </span>
                )}
              </div>

              {/* Reuse DayCell content logic but force it to be expanded/visible */}
              <div className="min-h-[100px] bg-slate-100/50">
                 <DayCell
                    date={day}
                    currentMonth={currentDate}
                    shifts={dayShifts}
                    onRemoveShift={onRemoveShift}
                    onUpdateShift={onUpdateShift}
                    onAddShift={onAddShift}
                    onAddJobAddNewJob={onAddJob}
                    isMobileView={true} // We might need to pass this prop to optimize DayCell for list view
                  />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
