import { useRef, useEffect, useState } from 'react';
import { X, Clock, Check, Bookmark } from 'lucide-react';
import { clsx } from 'clsx';
import type { Shift, JobConfig } from '../../../types';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { BottomSheet } from '../../ui/BottomSheet';

interface TimeEditorProps {
  position: { top: number; left: number; openAbove?: boolean };
  shift: Shift;
  job: JobConfig | undefined;
  onClose: () => void;
  onSave: (updates: Partial<Shift>) => void;
  onDelete: () => void;
  onTemplateSave: () => void;
  isMobile?: boolean;
}

export const TimeEditor = ({
  position,
  shift,
  job,
  onClose,
  onSave,
  onDelete,
  onTemplateSave,
  isMobile: isMobileProp,
}: TimeEditorProps) => {
  const timeInfoRef = useRef<HTMLDivElement>(null);
  const [tempStartTime, setTempStartTime] = useState(
    shift.startTime || job?.defaultStartTime || ''
  );
  const [tempEndTime, setTempEndTime] = useState(
    shift.endTime || job?.defaultEndTime || ''
  );
  const [tempBreakMinutes, setTempBreakMinutes] = useState(
    (shift.breakMinutes ?? job?.defaultBreakMinutes ?? 0) / 60
  );
  const isMobileQuery = useMediaQuery('(max-width: 768px)');
  const isMobile = isMobileProp ?? isMobileQuery;

  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (timeInfoRef.current && !timeInfoRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isMobile]);

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = endH * 60 + endM - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // Handle overnight
    return Math.max(0, Number((diff / 60).toFixed(2)));
  };

  const handleSave = () => {
    const breakMinutesValue = Math.round(tempBreakMinutes * 60);

    const updates: Partial<Shift> = {
      startTime: tempStartTime,
      endTime: tempEndTime,
      breakMinutes: breakMinutesValue,
    };

    if (tempStartTime && tempEndTime) {
      updates.hours = calculateHours(tempStartTime, tempEndTime);
    }

    onSave(updates);
  };

  const editorContent = (
    <>
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> Edit Shift Time
        </span>
        {!isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-3 items-center">
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs text-slate-500 font-medium">Start</label>
          <input
            type="time"
            inputMode="numeric"
            value={tempStartTime}
            onChange={(e) => setTempStartTime(e.target.value)}
            className="w-full text-base border border-slate-200 rounded-lg px-3 py-3 min-h-[48px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs text-slate-500 font-medium">End</label>
          <input
            type="time"
            inputMode="numeric"
            value={tempEndTime}
            onChange={(e) => setTempEndTime(e.target.value)}
            className="w-full text-base border border-slate-200 rounded-lg px-3 py-3 min-h-[48px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3">
        <label className="text-xs text-slate-500 font-medium">Break (hours)</label>
        <input
          type="number"
          inputMode="decimal"
          pattern="[0-9]*"
          min="0"
          step="0.25"
          value={tempBreakMinutes}
          onChange={(e) => setTempBreakMinutes(Number(e.target.value))}
          className="w-full text-base border border-slate-200 rounded-lg px-3 py-3 min-h-[48px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSave();
        }}
        className="w-full py-3.5 min-h-[48px] bg-indigo-600 text-white rounded-lg text-base font-bold hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center gap-1.5 mt-4"
      >
        <Check className="w-5 h-5" /> Save Changes
      </button>

      <div className="pt-3 mt-3 border-t border-slate-100 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTemplateSave();
          }}
          className="flex-1 py-3 min-h-[48px] bg-slate-50 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <Bookmark className="w-4 h-4" /> Template
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this shift?')) {
              onDelete();
            }
          }}
          className="flex-1 py-3 min-h-[48px] bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" /> Delete
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        snapPoints={[0.55, 0.75]}
        initialSnap={0}
        closeOnBackdropClick={false}
      >
        <div className="pb-4">
          {editorContent}
        </div>
      </BottomSheet>
    );
  }

  return (
    <div
      ref={timeInfoRef}
      style={{
        top: position.top,
        left: position.left,
        position: 'fixed',
      }}
      className={clsx(
        '-translate-x-1/2 z-[999] bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[220px] animate-in fade-in zoom-in-95 duration-150 flex flex-col',
        position.openAbove !== false ? '-translate-y-full mt-[-10px]' : 'mt-[10px]'
      )}
    >
      {editorContent}
    </div>
  );
};
