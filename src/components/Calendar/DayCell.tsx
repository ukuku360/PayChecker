import { memo } from 'react';
import { isSameMonth, isToday, format } from 'date-fns';
import { Copy, ClipboardPaste } from 'lucide-react';
import { clsx } from 'clsx';
import type { Shift } from '../../types';
import { getHolidayInfo, isPublicHoliday } from '../../data/holidays';
import { useCountry } from '../../hooks/useCountry';
import { useLongPress } from '../../hooks/useLongPress';
import { useDayCellLogic } from './hooks/useDayCellLogic';

// Subcomponents
import { JobPicker } from './DayCell/JobPicker';
import { NoteEditor } from './DayCell/NoteEditor';
import { TimeEditor } from './DayCell/TimeEditor';
import { ShiftItem } from './DayCell/ShiftItem';



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

export const DayCell = memo(function DayCell({
  date,
  currentMonth,
  shifts,
  onRemoveShift,
  onUpdateShift,
  onAddShift,
  onAddJobAddNewJob,
  isMobileView,
}: DayCellProps) {
  const {
    jobConfigs,
    templates,
    copiedShifts,
    removeTemplate,
    popupState,
    setPopupState,
    closePopup,
    setNodeRef,
    isOver,
    calculatePopupPosition,
    handleInteraction,
    handleJobSelect,
    handleTemplateSelect,
    handleSaveAsTemplate,
    handlePaste,
    handleCopy,
    dateStr
  } = useDayCellLogic(date, shifts, onAddShift, onUpdateShift);
  
  const { country } = useCountry();

  const cellLongPressProps = useLongPress({
    onLongPress: handleInteraction,
    onDoubleClick: handleInteraction,
  });

  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const holidayInfo = getHolidayInfo(dateStr, country);
  const isHolidayDate = isPublicHoliday(dateStr, country);

  return (
    <div
      ref={setNodeRef}
      {...cellLongPressProps}
      title={
        shifts.length === 0 ? 'Double-click (or long press) to add shift' : undefined
      }
      className={clsx(
        'p-2 flex flex-col gap-2 transition-colors relative border-slate-50 last:border-r-0 cursor-pointer group/cell select-none',
        isMobileView
          ? 'min-h-[60px] border-b-0'
          : 'min-h-[120px] border-b border-r',
        !isCurrentMonth && !isMobileView && 'bg-slate-50/30 text-slate-300',
        isCurrentMonth && !isHolidayDate && 'bg-white hover:bg-slate-50/50',
        isCurrentMonth && isHolidayDate && 'bg-rose-50/60 hover:bg-rose-50/80',
        isOver && 'bg-blue-50/30 ring-2 ring-blue-400/20 ring-inset z-10',
        isTodayDate && !isHolidayDate && 'bg-indigo-50/30'
      )}
    >
      {/* --- Popups --- */}

      {popupState.type === 'jobPicker' ? (
        <JobPicker
          position={popupState.position}
          onClose={closePopup}
          jobConfigs={jobConfigs}
          templates={templates}
          shifts={shifts}
          onAddJobAddNewJob={onAddJobAddNewJob}
          onSelectJob={handleJobSelect}
          onSelectTemplate={handleTemplateSelect}
          onDeleteTemplate={(id) => {
            if (confirm('Delete this template?')) removeTemplate(id);
          }}
          isMobile={isMobileView}
        />
      ) : null}

      {popupState.type === 'noteEditor' ? (
        <NoteEditor
          position={popupState.position}
          initialNote={shifts.find((s) => s.id === popupState.shiftId)?.note || ''}
          onClose={closePopup}
          onSave={(note) => {
            onUpdateShift(popupState.shiftId, { note });
            closePopup();
          }}
          isMobile={isMobileView}
        />
      ) : null}

      {popupState.type === 'timeEditor' ? (
        <TimeEditor
          position={popupState.position}
          shift={shifts.find((s) => s.id === popupState.shiftId)!}
          job={jobConfigs.find(
            (j) => j.id === shifts.find((s) => s.id === popupState.shiftId)?.type
          )}
          onClose={closePopup}
          onSave={(updates) => {
            onUpdateShift(popupState.shiftId, updates);
            closePopup();
          }}
          onDelete={() => {
            onRemoveShift(popupState.shiftId);
            closePopup();
          }}
          onTemplateSave={handleSaveAsTemplate}
          isMobile={isMobileView}
        />
      ) : null}

      {/* --- Header --- */}

      <div className="flex items-center justify-between relative">
        {!isMobileView && (
          <span
            className={clsx(
              'text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors',
              isTodayDate
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : isHolidayDate
                ? 'text-rose-600'
                : date.getDay() === 0
                ? 'text-red-500'
                : date.getDay() === 6
                ? 'text-blue-500'
                : 'text-slate-700'
            )}
          >
            {format(date, 'd')}
          </span>
        )}

        {/* Copy/Paste Controls - 44px touch targets */}
        <div className="flex gap-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity absolute -right-1 -top-1">
          {shifts.length > 0 && (
            <button
              onClick={handleCopy}
              className="p-2.5 hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Copy Schedule"
              aria-label="Copy schedule"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {copiedShifts && copiedShifts.length > 0 && (
            <button
              onClick={handlePaste}
              className="p-2.5 hover:bg-indigo-50 active:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Paste Schedule"
              aria-label="Paste schedule"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
          )}
        </div>

        {holidayInfo && isCurrentMonth && (
          <span
            className="text-xs font-medium text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded-full truncate max-w-[70px] ml-auto mr-1"
            title={holidayInfo.name}
          >
            {holidayInfo.nameKo || holidayInfo.name.slice(0, 8)}
          </span>
        )}
      </div>

      {/* --- Shifts List --- */}

      <div className="space-y-1.5">
        {shifts.map((shift) => (
          <ShiftItem
            key={shift.id}
            shift={shift}
            jobConfigs={jobConfigs}
            date={date}
            onUpdateShift={onUpdateShift}
            onRemoveShift={onRemoveShift}
            onNoteClick={(s, e) => {
              e.stopPropagation();
              const target = e.currentTarget as HTMLElement;
              setPopupState({
                type: 'noteEditor',
                shiftId: s.id,
                position: calculatePopupPosition(target),
              });
            }}
            onTimeEditOpen={(s, e) => {
              const target = e.currentTarget as HTMLElement;
              setPopupState({
                type: 'timeEditor',
                shiftId: s.id,
                position: calculatePopupPosition(target),
              });
            }}
          />
        ))}
      </div>
    </div>
  );
});
