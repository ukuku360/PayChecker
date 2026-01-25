import { useDroppable } from '@dnd-kit/core';
import { format, isSameMonth, isToday, isWeekend } from 'date-fns';
import { Copy, ClipboardPaste } from 'lucide-react';
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
  const { jobConfigs, holidays, copiedShifts, setCopiedShifts } = useScheduleStore();
  const dateStr = format(date, 'yyyy-MM-dd');
  const [showJobPicker, setShowJobPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-day-${dateStr}`,
    data: { date: dateStr },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowJobPicker(false);
      }
    };
    if (showJobPicker) document.addEventListener('mousedown', handleClickOutside);
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
    onAddShift({ id: `${dateStr}-${jobId}-${Date.now()}`, date: dateStr, type: jobId, hours: defaultHours });
    setShowJobPicker(false);
  };

  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const holidayInfo = getHolidayInfo(dateStr);
  const isHolidayDate = isPublicHoliday(dateStr);
  const getJobColor = (jobId: string) => jobConfigs.find(j => j.id === jobId)?.color || 'slate';

  return (
    <div ref={setNodeRef} onDoubleClick={handleDoubleClick}
      className={clsx(
        'min-h-[120px] p-3 flex flex-col gap-2 transition-all relative border-b border-r border-slate-50 last:border-r-0 cursor-pointer group/cell',
        !isCurrentMonth && 'bg-slate-50/30 text-slate-300',
        isCurrentMonth && !isHolidayDate && 'bg-white hover:bg-slate-50/50',
        isCurrentMonth && isHolidayDate && 'bg-rose-50/60 hover:bg-rose-50/80',
        isOver && 'bg-blue-50/30 ring-2 ring-blue-400/20 ring-inset z-10',
        isTodayDate && !isHolidayDate && 'bg-indigo-50/30',
      )}>
      {showJobPicker && (
        <div ref={pickerRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[120px] animate-in fade-in zoom-in-95 duration-150">
          <div className="text-xs font-medium text-slate-500 px-2 py-1 mb-1">Add Job</div>
          {jobConfigs.map((job) => {
            const colors = colorMap[job.color] || colorMap.slate;
            const alreadyAdded = shifts.some(s => s.type === job.id);
            return (
              <button key={job.id} onClick={(e) => { e.stopPropagation(); handleJobSelect(job.id); }} disabled={alreadyAdded}
                className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  alreadyAdded ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400' : `${colors.bg} ${colors.text} hover:shadow-md hover:-translate-y-0.5`)}>
                <span className={clsx('w-2 h-2 rounded-full', `bg-${job.color}-500`)}></span>
                {job.name}{alreadyAdded && <span className="text-xs opacity-60 ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between relative">
        <span className={clsx('text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors',
          isTodayDate ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : isHolidayDate ? 'text-rose-600' : (date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-slate-700'))}>
          {format(date, 'd')}
        </span>
        
        <div className="flex gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity absolute right-0 top-0">
          {shifts.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const shiftsToCopy = shifts.map(s => ({ type: s.type, hours: s.hours }));
                setCopiedShifts(shiftsToCopy);
              }}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
              title="Copy Schedule"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {copiedShifts && copiedShifts.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copiedShifts.forEach(copied => {
                  onAddShift({
                    id: `${dateStr}-${copied.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    date: dateStr,
                    type: copied.type,
                    hours: copied.hours
                  });
                });
                // Optional: setCopiedShifts(null); // Keep clipboard after paste for multiple pastes
              }}
              className="p-1 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded"
              title="Paste Schedule"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {holidayInfo && isCurrentMonth && (
          <span className="text-[9px] font-medium text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded-full truncate max-w-[70px] ml-auto mr-1" title={holidayInfo.name}>
            {holidayInfo.nameKo || holidayInfo.name.slice(0, 8)}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {shifts.map((shift) => {
          const colors = colorMap[getJobColor(shift.type)] || colorMap.slate;
          return (
            <div key={shift.id} className={clsx('text-xs px-2.5 py-1.5 rounded-lg border flex flex-col gap-1 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group relative', colors.bg, colors.border, colors.text)}>
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{shift.type}</span>
                  <div className="flex items-center gap-0.5">
                    <input 
                      type="number" 
                      min="0" 
                      step="0.5" 
                      value={shift.hours} 
                      onChange={(e) => { e.stopPropagation(); onUpdateShift(shift.id, { hours: parseFloat(e.target.value) || 0 }); }} 
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 text-sm bg-white/50 border border-current/20 rounded px-1.5 py-1 focus:ring-1 focus:ring-current/30 text-center font-bold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                    <span className="opacity-70 text-[10px]">h</span>

                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onRemoveShift(shift.id); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-all absolute -top-1 -right-1 z-10 bg-white shadow-sm border border-red-100 flex items-center justify-center w-5 h-5">×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
