import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayCell } from './DayCell';
import { useScheduleStore } from '../../store/useScheduleStore';

interface CalendarGridProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

export const CalendarGrid = ({ currentDate, onMonthChange }: CalendarGridProps) => {
  const { shifts, removeShift, updateShift, addShift } = useScheduleStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => onMonthChange(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition-colors ring-1 ring-slate-100 dark:ring-slate-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onMonthChange(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition-colors ring-1 ring-slate-100 dark:ring-slate-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
        {weekDays.map((day) => (
          <div key={day} className="py-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
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
              onUpdateShift={updateShift}
              onAddShift={addShift}
            />
          );
        })}
      </div>
    </div>
  );
};
