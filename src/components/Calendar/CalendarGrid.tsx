import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
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
              onUpdateShift={updateShift}
              onAddShift={addShift}
            />
          );
        })}
      </div>
    </div>
  );
};

const GlobalSaveButton = () => {
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    // Since Zustand persist and onUpdateShift handle the actual saving automatically,
    // this button serves as a manual confirmation and reassurance for the user.
    // We could trigger a re-fetch or sync check here if needed.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <button
      onClick={handleSave}
      className={clsx(
        "neu-btn flex items-center gap-2",
        saved && "!bg-emerald-100/50 !text-emerald-600 neu-pressed"
      )}
    >
      <Save className={clsx("w-4 h-4", saved ? "text-emerald-600" : "text-slate-500")} />
      <span>{saved ? 'Saved!' : 'Save'}</span>
    </button>
  );
};

