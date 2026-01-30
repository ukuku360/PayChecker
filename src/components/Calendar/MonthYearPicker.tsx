import { useState, useRef, useEffect } from 'react';
import { format, setMonth, setYear, addYears } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface MonthYearPickerProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

export const MonthYearPicker = ({ currentDate, onMonthChange }: MonthYearPickerProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(currentDate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleYearChange = (increment: number) => {
    setViewDate(prev => addYears(prev, increment));
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(currentDate, viewDate.getFullYear()), monthIndex);
    onMonthChange(newDate);
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    onMonthChange(new Date());
    setIsOpen(false);
  };

  // Function to format date using i18n month names if available, or fallback to date-fns
  const formatMonthYear = (date: Date) => {
    const monthKey = format(date, 'MMMM').toLowerCase();
    const translatedMonth = t(`calendar.months.${monthKey}`, { defaultValue: format(date, 'MMMM') });
    return `${translatedMonth} ${format(date, 'yyyy')}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/50 transition-all group"
      >
        <h2 className="text-2xl font-bold text-slate-700 tracking-tight group-hover:text-indigo-600 transition-colors">
          {formatMonthYear(currentDate)}
        </h2>
        <ChevronDown className={clsx("w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-all", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 w-[320px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={() => handleYearChange(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold text-slate-700">{format(viewDate, 'yyyy')}</span>
            <button
              onClick={() => handleYearChange(1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {months.map((month, index) => {
              const isSelected = currentDate.getMonth() === index && currentDate.getFullYear() === viewDate.getFullYear();
              const isCurrentMonth = new Date().getMonth() === index && new Date().getFullYear() === viewDate.getFullYear();
              
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={clsx(
                    "p-2 text-sm rounded-lg transition-all font-medium",
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600",
                    isCurrentMonth && !isSelected && "ring-1 ring-inset ring-indigo-200 bg-indigo-50/50"
                  )}
                >
                  {t(`calendar.months.${month.toLowerCase()}`, month.substring(0, 3))}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleTodayClick}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            {t('calendar.today', 'Today')}
          </button>
        </div>
      )}
    </div>
  );
};
