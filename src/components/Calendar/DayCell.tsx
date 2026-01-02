import { useDroppable } from '@dnd-kit/core';
import { format, isSameMonth, isToday, isWeekend } from 'date-fns';
import { clsx } from 'clsx';
import { useState, useRef, useEffect } from 'react';
import type { Shift } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { colorMap } from '../../utils/colorUtils';
import { getHolidayInfo, isPublicHoliday } from '../../data/australianHolidays';

interface DayCellProps {
  date: Date;
  currentMonth: Date;
  shifts: Shift[];
  onRemoveShift: (id: string) => void;
  onUpdateShift: (id: string, shift: Partial<Shift>) => void;
  onAddShift: (shift: Shift) => void;
}

export const DayCell = ({ date, currentMonth, shifts, onRemoveShift, onUpdateShift, onAddShift }: DayCellProps) => {
  const { jobConfigs, holidays } = useScheduleStore();
  const dateStr = format(date, 'yyyy-MM-dd');
  const [showJobPicker, setShowJobPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-day-${dateStr}`,
    data: {
      date: dateStr,
    },
  });

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowJobPicker(false);
      }
    };
    if (showJobPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showJobPicker]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowJobPicker(true);
  };

  const handleJobSelect = (jobId: string) => {
    const job = jobConfigs.find(j => j.id === jobId);
    if (!job) return;

    const isWeekendDay = isWeekend(date);
    const isHoliday = holidays.includes(dateStr);
    const defaultHours = (isWeekendDay || isHoliday) ? job.defaultHours.weekend : job.defaultHours.weekday;

    const newShift: Shift = {
      id: `${dateStr}-${jobId}-${Date.now()}`,
      date: dateStr,
      type: jobId,
      hours: defaultHours,
      overtimeHours: 0,
    };

    onAddShift(newShift);
    setShowJobPicker(false);
  };

  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const holidayInfo = getHolidayInfo(dateStr);
  const isHolidayDate = isPublicHoliday(dateStr);

  const getJobColor = (jobId: string) => {
    const job = jobConfigs.find(j => j.id === jobId);
    return job?.color || 'slate';
  };

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={handleDoubleClick}
      className={clsx(
        'min-h-[120px] p-3 flex flex-col gap-2 transition-all relative border-b border-r border-slate-50 dark:border-slate-700 last:border-r-0 cursor-pointer',
        !isCurrentMonth && 'bg-slate-50/30 dark:bg-slate-900/30 text-slate-300 dark:text-slate-600',
        isCurrentMonth && !isHolidayDate && 'bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/50',
        isCurrentMonth && isHolidayDate && 'bg-rose-50/60 dark:bg-rose-900/20 hover:bg-rose-50/80 dark:hover:bg-rose-900/30',
        isOver && 'bg-blue-50/30 dark:bg-blue-900/20 ring-2 ring-blue-400/20 ring-inset z-10',
        isTodayDate && !isHolidayDate && 'bg-indigo-50/30 dark:bg-indigo-900/20',
      )}
    >
      {/* Job Picker Popup */}
      {showJobPicker && (
        <div
          ref={pickerRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[120px] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-xs font-medium text-slate-500 px-2 py-1 mb-1">Add Job</div>
          {jobConfigs.map((job) => {
            const colors = colorMap[job.color] || colorMap.slate;
            const alreadyAdded = shifts.some(s => s.type === job.id);
            return (
              <button
                key={job.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJobSelect(job.id);
                }}
                disabled={alreadyAdded}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  alreadyAdded 
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                    : `${colors.bg} ${colors.text} hover:shadow-md hover:-translate-y-0.5`
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full', `bg-${job.color}-500`)}></span>
                {job.name}
                {alreadyAdded && <span className="text-xs opacity-60 ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors',
            isTodayDate ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 
              isHolidayDate ? 'text-rose-600 dark:text-rose-400' :
              (date.getDay() === 0 ? 'text-red-500 dark:text-red-400' : date.getDay() === 6 ? 'text-blue-500 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300')
          )}
        >
          {format(date, 'd')}
        </span>
        {holidayInfo && isCurrentMonth && (
          <span className="text-[9px] font-medium text-rose-500 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded-full truncate max-w-[70px]" title={holidayInfo.name}>
            {holidayInfo.nameKo || holidayInfo.name.slice(0, 8)}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {shifts.map((shift) => {
          const color = getJobColor(shift.type);
          const colors = colorMap[color] || colorMap.slate;

          return (
            <div
              key={shift.id}
              className={clsx(
                'text-xs px-2.5 py-1.5 rounded-lg border flex flex-col gap-1 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group relative',
                colors.bg, colors.border, colors.text,
                shift.overtimeHours > 0 && 'ring-1 ring-offset-1 ring-amber-400'
              )}
              onClick={() => {
                 if (shift.overtimeHours === 0) {
                   onUpdateShift(shift.id, { overtimeHours: 1 });
                 }
              }}
            >
              <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">{shift.type}</span>
                    <span className="opacity-70 text-[10px] tabular-nums">{shift.hours}h base</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      {shift.overtimeHours > 0 && (
                        <div className="flex items-center gap-1 bg-amber-50 rounded-md border border-amber-200 p-0.5 shadow-sm">
                          <span className="text-[9px] font-bold text-amber-500 px-1">OT</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={shift.overtimeHours}
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateShift(shift.id, { overtimeHours: val });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="w-10 text-[10px] bg-transparent border-none focus:ring-0 p-0 text-center font-bold text-amber-600"
                          />
                          <span className="text-[9px] font-bold text-amber-500 pr-1">h</span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveShift(shift.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-all absolute -top-1 -right-1 z-10 bg-white shadow-sm border border-red-100 flex items-center justify-center w-5 h-5"
                    >
                      ×
                    </button>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
