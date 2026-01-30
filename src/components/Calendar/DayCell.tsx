import { useDroppable } from '@dnd-kit/core';
import { format, isSameMonth, isToday, isWeekend } from 'date-fns';
import { Copy, ClipboardPaste, StickyNote, X, Check, Plus as Plus_Lucide, Clock, Bookmark } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useRef, useEffect } from 'react';
import type { Shift } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { colorMap } from '../../utils/colorUtils';
import { getHolidayInfo, isPublicHoliday } from '../../data/holidays';
import { calculatePaidHours } from '../../utils/calculatePay';
import { useCountry } from '../../hooks/useCountry';
import { useLongPress } from '../../hooks/useLongPress';

interface DayCellProps {
  date: Date;
  currentMonth: Date;
  shifts: Shift[];
  onRemoveShift: (id: string) => void;
  onUpdateShift: (id: string, shift: Partial<Shift>) => void;
  onAddShift: (shift: Shift) => void;
  onAddJobAddNewJob?: () => void;
  isMobileView?: boolean;
}

export const DayCell = ({ date, currentMonth, shifts, onRemoveShift, onUpdateShift, onAddShift, onAddJobAddNewJob, isMobileView }: DayCellProps) => {
  const { jobConfigs, holidays, copiedShifts, setCopiedShifts, templates, addTemplate, removeTemplate } = useScheduleStore();
  const { country } = useCountry();
  const dateStr = format(date, 'yyyy-MM-dd');
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'jobs' | 'templates'>('jobs');
  
  // State for Note Editing
  const [editingNoteShiftId, setEditingNoteShiftId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  
  // State for Time Editing
  const [editingTimeShiftId, setEditingTimeShiftId] = useState<string | null>(null);
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');
  const [tempBreakMinutes, setTempBreakMinutes] = useState(0);

  // Popup positioning state
  const [popupPosition, setPopupPosition] = useState<{ top: number, left: number } | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const timeInfoRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-day-${dateStr}`,
    data: { date: dateStr },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowJobPicker(false);
      }
      if (noteRef.current && !noteRef.current.contains(event.target as Node)) {
        setEditingNoteShiftId(null);
      }
      if (timeInfoRef.current && !timeInfoRef.current.contains(event.target as Node)) {
        setEditingTimeShiftId(null);
      }
    };
    if (showJobPicker || editingNoteShiftId || editingTimeShiftId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showJobPicker, editingNoteShiftId, editingTimeShiftId]);

  const calculatePopupPosition = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    // Default to centering on the element, but adjusting for viewport edges would be better in a real app
    // For now, simpler approach: Center on screen or center on element?
    // User issue was clipping. Fixed positioning resolves clipping.
    // Let's position it near the click target but ensure it's on screen.
    
    // Position: Center of the target element
    // We will adjust the translate in CSS to center the popup itself
    return {
      top: rect.top + rect.height / 2,
      left: rect.left + rect.width / 2
    };
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    setPopupPosition(calculatePopupPosition(target));
    
    setPickerTab('jobs');
    setShowJobPicker(true);
  };

  const cellLongPressProps = useLongPress({
    onLongPress: handleInteraction,
    onDoubleClick: handleInteraction,
    // Note: Single click is handled by users manually adding logic if needed, 
    // but here we just want the add-job picker on long press or double click.
  });

  const handleJobSelect = (jobId: string) => {
    const job = jobConfigs.find(j => j.id === jobId);
    if (!job) return;
    const isWeekendDay = isWeekend(date);
    const isHoliday = holidays.includes(dateStr);
    
    let hours = (isWeekendDay || isHoliday) ? job.defaultHours.weekend : job.defaultHours.weekday;
    const startTime = job.defaultStartTime;
    const endTime = job.defaultEndTime;

    if (startTime && endTime) {
        hours = calculateHours(startTime, endTime);
    }

    onAddShift({ 
        id: `${dateStr}-${jobId}-${Date.now()}`, 
        date: dateStr, 
        type: jobId, 
        hours, 
        note: '', 
        startTime, 
        endTime,
        // Don't set breakMinutes - let calculatePaidHours use job default
    });
    setShowJobPicker(false);
  };

  const handleNoteSave = (shiftId: string) => {
    onUpdateShift(shiftId, { note: tempNote });
    setEditingNoteShiftId(null);
  };

  const handleNoteOpen = (shift: Shift, e: React.MouseEvent | React.TouchEvent) => {
     e.stopPropagation();
     const target = e.currentTarget as HTMLElement;
     setPopupPosition(calculatePopupPosition(target));
     
     setTempNote(shift.note || '');
     setEditingNoteShiftId(shift.id);
  };

  const handleTimeEditOpen = (shift: Shift, e: React.MouseEvent | React.TouchEvent) => {
    const job = jobConfigs.find(j => j.id === shift.type);
    
    const target = e.currentTarget as HTMLElement;
    setPopupPosition(calculatePopupPosition(target));

    setTempStartTime(shift.startTime || job?.defaultStartTime || '');
    setTempEndTime(shift.endTime || job?.defaultEndTime || '');
    // Convert minutes to hours for display
    const breakMins = shift.breakMinutes ?? job?.defaultBreakMinutes ?? 0;
    setTempBreakMinutes(breakMins / 60);
    setEditingTimeShiftId(shift.id);
    setShowJobPicker(false);
  };

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // Handle overnight
    // Don't subtract break here - break is handled by calculatePaidHours for display
    return Math.max(0, Number((diff / 60).toFixed(2)));
  };

  const handleTimeSave = () => {
    if (!editingTimeShiftId) return;
    
    // Convert hours back to minutes for storage
    const breakMinutesValue = Math.round(tempBreakMinutes * 60);
    
    const updates: Partial<Shift> = {
      startTime: tempStartTime,
      endTime: tempEndTime,
      breakMinutes: breakMinutesValue
    };

    if (tempStartTime && tempEndTime) {
      // Calculate total hours (without break deduction - that's done by calculatePaidHours)
      updates.hours = calculateHours(tempStartTime, tempEndTime);
    }

    onUpdateShift(editingTimeShiftId, updates);
    setEditingTimeShiftId(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Recalculate hours based on template times
    const hours = calculateHours(template.startTime, template.endTime);

    onAddShift({
      id: `${dateStr}-${template.jobId}-${Date.now()}`,
      date: dateStr,
      type: template.jobId,
      hours, 
      note: '', // Can be extended to save note in template later
      startTime: template.startTime,
      endTime: template.endTime,
      breakMinutes: template.breakMinutes
    });
    setShowJobPicker(false);
  };

  const handleSaveAsTemplate = (shift: Shift) => {
    // Simple prompt for now
    // In a real app, use a proper modal
    const name = prompt("Enter template name (e.g., 'Morning Shift')");
    if (!name) return;

    // Ensure we have time data. If not, fallback to defaults or 0
    // But usually we are editing a shift that has times or defaults.
    const job = jobConfigs.find(j => j.id === shift.type);
    const startTime = shift.startTime || job?.defaultStartTime || "09:00";
    const endTime = shift.endTime || job?.defaultEndTime || "17:00";
    const breakMinutes = shift.breakMinutes ?? job?.defaultBreakMinutes ?? 0;

    addTemplate({
      id: `tpl-${Date.now()}`,
      name,
      jobId: shift.type,
      startTime,
      endTime,
      breakMinutes
    });
    
    // Optional: Toast message
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Delete this template?')) {
          removeTemplate(id);
      }
  };

  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const holidayInfo = getHolidayInfo(dateStr, country);
  const isHolidayDate = isPublicHoliday(dateStr, country);
  const getJobColor = (jobId: string) => jobConfigs.find(j => j.id === jobId)?.color || 'slate';
  const getJobName = (jobId: string) => jobConfigs.find(j => j.id === jobId)?.name || jobId;

  return (
    <div ref={setNodeRef} {...cellLongPressProps}
                title={shifts.length === 0 ? "Double-click (or long press) to add shift" : undefined}
      className={clsx(
        'p-2 flex flex-col gap-2 transition-all relative border-slate-50 last:border-r-0 cursor-pointer group/cell select-none',
        isMobileView ? 'min-h-[60px] border-b-0' : 'min-h-[120px] border-b border-r',
        !isCurrentMonth && !isMobileView && 'bg-slate-50/30 text-slate-300',
        isCurrentMonth && !isHolidayDate && 'bg-white hover:bg-slate-50/50',
        isCurrentMonth && isHolidayDate && 'bg-rose-50/60 hover:bg-rose-50/80',
        isOver && 'bg-blue-50/30 ring-2 ring-blue-400/20 ring-inset z-10',
        isTodayDate && !isHolidayDate && 'bg-indigo-50/30',
      )}>
      {showJobPicker && popupPosition && (
        <div 
            ref={pickerRef} 
            style={{ 
                top: popupPosition.top, 
                left: popupPosition.left,
                position: 'fixed'
            }}
            className="-translate-x-1/2 -translate-y-1/2 z-[999] bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[150px] animate-in fade-in zoom-in-95 duration-150"
        >
          
          {/* Tabs */}
          <div className="flex p-0.5 bg-slate-100 rounded-lg mb-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setPickerTab('jobs'); }}
              className={clsx("flex-1 py-1 text-[10px] font-bold rounded-md transition-all", pickerTab === 'jobs' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Jobs
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setPickerTab('templates'); }}
              className={clsx("flex-1 py-1 text-[10px] font-bold rounded-md transition-all", pickerTab === 'templates' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Templates
            </button>
          </div>

          {pickerTab === 'jobs' ? (
              <>
                 <div className="flex items-center justify-between mb-1 px-2 py-1">
                    <span className="text-xs font-medium text-slate-500">Pick Job</span>
                    <button 
                    onClick={(e) => { e.stopPropagation(); onAddJobAddNewJob?.(); setShowJobPicker(false); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-500 transition-colors"
                    title="Create New Job"
                    >
                    <Plus_Lucide className="w-3 h-3" />
                    </button>
                </div>
                {jobConfigs.length === 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddJobAddNewJob?.(); setShowJobPicker(false); }}
                        className="w-full text-center px-3 py-4 rounded-lg text-xs text-slate-400 hover:text-indigo-500 hover:bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-200 transition-all flex flex-col items-center gap-1"
                    >
                        <Plus_Lucide className="w-4 h-4" />
                        <span>Create First Job</span>
                    </button>
                )}
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
              </>
          ) : (
              <>
                <div className="max-h-[200px] overflow-y-auto">
                    {templates.length === 0 ? (
                        <div className="text-center py-4 px-2">
                             <div className="bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Bookmark className="w-4 h-4 text-slate-300" />
                             </div>
                             <p className="text-[10px] text-slate-400">
                                Save shifts as templates to reuse them here.
                             </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {templates.map(t => {
                                const job = jobConfigs.find(j => j.id === t.jobId);
                                return (
                                    <div key={t.id} className="group/item relative">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleTemplateSelect(t.id); }}
                                            className={clsx(
                                                "w-full text-left px-2 py-2 rounded-lg text-xs transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100",
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', `bg-${job?.color || 'slate'}-500`)}></span>
                                                <span className="font-bold text-slate-700 truncate">{t.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-3.5">
                                                <Clock className="w-3 h-3" />
                                                <span>{t.startTime} - {t.endTime}</span>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteTemplate(e, t.id)}
                                            className="absolute top-1 right-1 p-1 text-slate-300 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
              </>
          )}

        </div>
      )}

      {/* Note Editor Popover */}
      {editingNoteShiftId && popupPosition && (
          <div 
            ref={noteRef} 
            style={{ 
                top: popupPosition.top, 
                left: popupPosition.left,
                position: 'fixed'
            }}
            className="-translate-x-1/2 -translate-y-full mt-[-10px] z-[999] bg-yellow-50 rounded-xl shadow-xl border border-yellow-200 p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2"
          >
             <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide">Shift Note</span>
                 <button onClick={(e) => { e.stopPropagation(); setEditingNoteShiftId(null); }} className="text-yellow-400 hover:text-yellow-600"><X className="w-3 h-3" /></button>
             </div>
             <textarea 
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Add a note..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="w-full h-16 bg-white/50 border-none rounded-lg text-xs p-2 text-slate-700 resize-none focus:ring-1 focus:ring-yellow-400"
             />
             <button 
                onClick={(e) => { e.stopPropagation(); handleNoteSave(editingNoteShiftId); }}
                className="w-full py-1.5 bg-yellow-400 text-yellow-900 rounded-lg text-xs font-bold hover:bg-yellow-500 transition-colors flex items-center justify-center gap-1"
             >
                 <Check className="w-3 h-3" /> Save Note
             </button>
          </div>
      )}

      {/* Time Editor Popover */}
      {editingTimeShiftId && popupPosition && (
          <div 
            ref={timeInfoRef} 
            style={{ 
                top: popupPosition.top, 
                left: popupPosition.left,
                position: 'fixed'
            }}
            className="-translate-x-1/2 -translate-y-full mt-[-10px] z-[999] bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3"
          >
             <div className="flex items-center justify-between border-b pb-2">
                 <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Shift Time
                 </span>
                 <button onClick={(e) => { e.stopPropagation(); setEditingTimeShiftId(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
             </div>
             
             <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] text-slate-400 font-medium">Start</label>
                    <input 
                        type="time" 
                        value={tempStartTime} 
                        onChange={(e) => setTempStartTime(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                </div>
                <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] text-slate-400 font-medium">End</label>
                    <input 
                        type="time" 
                        value={tempEndTime} 
                        onChange={(e) => setTempEndTime(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                </div>
             </div>

             <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Break (hours)</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        min="0"
                        step="0.25"
                        value={tempBreakMinutes} 
                        onChange={(e) => setTempBreakMinutes(Number(e.target.value))}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                </div>
             </div>

             <button 
                onClick={(e) => { e.stopPropagation(); handleTimeSave(); }}
                className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 mt-1"
             >
                 <Check className="w-3 h-3" /> Save Changes
             </button>
             
             <div className="pt-2 mt-1 border-t border-slate-100 flex gap-2">
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        const shift = shifts.find(s => s.id === editingTimeShiftId);
                        if (shift) handleSaveAsTemplate(shift); 
                    }}
                    className="flex-1 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                    <Bookmark className="w-3 h-3" /> Template
                </button>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (confirm('Delete this shift?')) {
                            onRemoveShift(editingTimeShiftId);
                            setEditingTimeShiftId(null);
                        }
                    }}
                    className="flex-1 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                    <X className="w-3 h-3" /> Delete
                </button>
             </div>
          </div>
      )}

      <div className="flex items-center justify-between relative">
        {!isMobileView && (
          <span className={clsx('text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors',
            isTodayDate ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : isHolidayDate ? 'text-rose-600' : (date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-slate-700'))}>
            {format(date, 'd')}
          </span>
        )}
        
        <div className="flex gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity absolute right-0 top-0">
          {shifts.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const shiftsToCopy = shifts.map(s => ({ type: s.type, hours: s.hours, note: s.note, startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes }));
                setCopiedShifts(shiftsToCopy);
              }}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
              title="Copy Schedule"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          {copiedShifts && copiedShifts.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copiedShifts.forEach(copied => {
                  // Check if this job type already exists on this date - prevent duplicates
                  const existingShift = shifts.find(s => s.type === copied.type);
                  if (existingShift) {
                    // Update existing shift instead of creating duplicate
                    onUpdateShift(existingShift.id, {
                      hours: copied.hours,
                      note: copied.note,
                      startTime: copied.startTime,
                      endTime: copied.endTime,
                      breakMinutes: copied.breakMinutes
                    });
                  } else {
                    onAddShift({
                      id: `${dateStr}-${copied.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      date: dateStr,
                      type: copied.type,
                      hours: copied.hours,
                      note: copied.note,
                      startTime: copied.startTime,
                      endTime: copied.endTime,
                      breakMinutes: copied.breakMinutes
                    });
                  }
                });
              }}
              className="p-1 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded"
              title="Paste Schedule"
            >
              <ClipboardPaste className="w-3 h-3" />
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
          
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const shiftLongPressProps = useLongPress({
            onLongPress: (e) => handleTimeEditOpen(shift, e),
            onDoubleClick: (e) => handleTimeEditOpen(shift, e),
            shouldStopPropagation: true,
          });

          return (
            <div 
                key={shift.id} 
                {...shiftLongPressProps}
                onDoubleClick={(e) => { e.stopPropagation(); /* Legacy handled by hook */ }} 
                title="Double-click (or long press) to edit time" 
                className={clsx('text-xs px-2.5 py-1.5 rounded-lg border flex flex-col gap-1 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group relative select-none', colors.bg, colors.border, colors.text)}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col gap-0.5 w-full">
                  <div className="flex justify-between items-center pr-4">
                      <span className="font-semibold truncate max-w-[50px]">{getJobName(shift.type)}</span>
                       {/* Note Indicator Button */}
                       <button
                            onClick={(e) => handleNoteOpen(shift, e)}
                            className={clsx(
                                "p-0.5 rounded transition-colors",
                                shift.note ? "text-amber-500 hover:text-amber-600 hover:bg-amber-100" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100"
                            )}
                            title={shift.note ? shift.note : "Add Note"}
                        >
                            <StickyNote className={clsx("w-3 h-3", shift.note && "fill-current")} />
                        </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={(() => {
                        // Fixed: Check for undefined/null instead of > 0 to allow 0 as valid input
                        if (shift.hours !== undefined && shift.hours !== null) return shift.hours;
                        const job = jobConfigs.find(j => j.id === shift.type);
                        const isWknd = isWeekend(date);
                        return job ? (isWknd ? job.defaultHours.weekend : job.defaultHours.weekday) : 0;
                      })()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const value = parseFloat(e.target.value);
                        // Validate: prevent NaN, negative, and values over 24
                        if (isNaN(value) || value < 0) return;
                        const hours = Math.min(24, Math.max(0, value));
                        onUpdateShift(shift.id, { hours });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 text-sm bg-white/50 border border-current/20 rounded px-1 py-0.5 focus:ring-1 focus:ring-current/30 text-center font-bold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="opacity-70 text-[10px]">h</span>
                    {(() => {
                      const paidHours = calculatePaidHours(shift, jobConfigs);
                      return paidHours < shift.hours ? (
                        <span className="text-[9px] text-slate-500 ml-0.5" title="Paid hours after break">
                          ({paidHours}h)
                        </span>
                      ) : null;
                    })()}
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
