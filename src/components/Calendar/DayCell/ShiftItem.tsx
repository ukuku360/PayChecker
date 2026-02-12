import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { StickyNote, Trash2 } from 'lucide-react';
import type { Shift, JobConfig } from '../../../types';
import { colorMap } from '../../../utils/colorUtils';
import { useLongPress } from '../../../hooks/useLongPress';
import { calculatePaidHours } from '../../../utils/calculatePay';
import { isWeekend } from 'date-fns';

interface ShiftItemProps {
  shift: Shift;
  jobConfigs: JobConfig[];
  date: Date; // Needed for isWeekend check for default hours calculation
  onUpdateShift: (id: string, shift: Partial<Shift>) => void;
  onRemoveShift: (id: string) => void;
  onNoteClick: (shift: Shift, e: React.MouseEvent | React.TouchEvent) => void;
  onTimeEditOpen: (shift: Shift, e: React.MouseEvent | React.TouchEvent) => void;
}

export const ShiftItem = memo(function ShiftItem({
  shift,
  jobConfigs,
  date,
  onUpdateShift,
  onRemoveShift,
  onNoteClick,
  onTimeEditOpen,
}: ShiftItemProps) {
  // Memoize job lookup to avoid recalculating on every render
  const job = useMemo(
    () => jobConfigs.find((j) => j.id === shift.type),
    [jobConfigs, shift.type]
  );

  const jobColor = job?.color || 'slate';
  const jobName = job?.name || shift.type;
  const colors = colorMap[jobColor] || colorMap.slate;

  // Swipe-to-delete state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeState = useRef<{ startX: number; startOffset: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_BUTTON_WIDTH = 72;
  const SWIPE_THRESHOLD = 36;

  const handleSwipeStart = useCallback((clientX: number) => {
    swipeState.current = {
      startX: clientX,
      startOffset: swipeOffset,
    };
    setIsSwiping(true);
  }, [swipeOffset]);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (!swipeState.current) return;

    const deltaX = swipeState.current.startX - clientX;
    let newOffset = swipeState.current.startOffset + deltaX;

    // Clamp between 0 and max
    newOffset = Math.max(0, Math.min(DELETE_BUTTON_WIDTH, newOffset));
    setSwipeOffset(newOffset);
  }, []);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeState.current) return;

    // Snap to open or closed
    if (swipeOffset > SWIPE_THRESHOLD) {
      setSwipeOffset(DELETE_BUTTON_WIDTH);
      setIsSwipeOpen(true);
    } else {
      setSwipeOffset(0);
      setIsSwipeOpen(false);
    }

    swipeState.current = null;
    setIsSwiping(false);
  }, [swipeOffset]);

  const closeSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsSwipeOpen(false);
    setIsSwiping(false);
  }, []);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleSwipeStart(e.touches[0].clientX);
  }, [handleSwipeStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleSwipeMove(e.touches[0].clientX);
  }, [handleSwipeMove]);

  const handleTouchEnd = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  // Close swipe when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (isSwipeOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
      closeSwipe();
    }
  }, [isSwipeOpen, closeSwipe]);

  // Add/remove outside click listener
  useEffect(() => {
    if (isSwipeOpen) {
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isSwipeOpen, handleClickOutside]);

   
  const shiftLongPressProps = useLongPress({
    onLongPress: (e) => {
      if (swipeOffset === 0) onTimeEditOpen(shift, e);
    },
    onDoubleClick: (e) => {
      if (swipeOffset === 0) onTimeEditOpen(shift, e);
    },
    shouldStopPropagation: true,
  });

  return (
    <div ref={containerRef} className="relative overflow-visible rounded-lg">
      {/* Delete button revealed by swipe */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-rose-500 text-white rounded-r-lg"
        style={{ width: DELETE_BUTTON_WIDTH }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            closeSwipe();
            onRemoveShift(shift.id);
          }}
          className="flex flex-col items-center justify-center w-full h-full p-2 min-w-[44px] min-h-[44px] active:bg-rose-600 transition-colors"
          aria-label="Delete shift"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium mt-0.5">Delete</span>
        </button>
      </div>

      {/* Main shift content - slides left on swipe */}
      <div
        {...shiftLongPressProps}
        onMouseDown={(e) => {
          e.stopPropagation();
          shiftLongPressProps.onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          shiftLongPressProps.onMouseUp?.(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          shiftLongPressProps.onTouchStart?.(e);
          handleTouchStart(e);
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          handleTouchMove(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          shiftLongPressProps.onTouchEnd?.(e);
          handleTouchEnd();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          /* Legacy handled by hook */
        }}
        title="Double-click (or long press) to edit time"
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        className={clsx(
          'text-xs px-2.5 py-1.5 rounded-lg border flex flex-col gap-1 shadow-sm transition-shadow hover:shadow-md group relative select-none',
          colors.bg,
          colors.border,
          colors.text
        )}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex flex-col gap-0.5 w-full">
            <div className="flex justify-between items-center pr-4">
              <span className="font-semibold truncate max-w-[50px]">
                {jobName}
              </span>
              {/* Note Indicator Button - 44px touch target */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (swipeOffset > 0) {
                    closeSwipe();
                    return;
                  }
                  onNoteClick(shift, e);
                }}
                className={clsx(
                  'p-2 -m-1.5 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center',
                  shift.note
                    ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-100 active:bg-amber-200'
                    : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 active:bg-slate-200 opacity-0 group-hover:opacity-100'
                )}
                title={shift.note ? shift.note : 'Add Note'}
                aria-label={shift.note ? 'Edit note' : 'Add note'}
              >
                <StickyNote className={clsx('w-4 h-4', shift.note && 'fill-current')} />
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={(() => {
                  if (shift.hours !== undefined && shift.hours !== null) return shift.hours;
                  if (!job) return 0;
                  return isWeekend(date) ? job.defaultHours.weekend : job.defaultHours.weekday;
                })()}
                onChange={(e) => {
                  e.stopPropagation();
                  const value = parseFloat(e.target.value);
                  if (isNaN(value) || value < 0) return;
                  const hours = Math.min(24, Math.max(0, value));
                  onUpdateShift(shift.id, { hours });
                }}
                onClick={(e) => e.stopPropagation()}
                inputMode="decimal"
                pattern="[0-9]*"
                className="w-12 text-sm bg-white/50 border border-current/20 rounded px-1.5 py-1 focus:ring-1 focus:ring-current/30 text-center font-bold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-h-[36px]"
              />
              <span className="opacity-70 text-xs">h</span>
              {(() => {
                const paidHours = calculatePaidHours(shift, jobConfigs);
                return paidHours < shift.hours ? (
                  <span className="text-xs text-slate-500 ml-0.5" title="Paid hours after break">
                    ({paidHours}h)
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          {/* Delete button - visible on desktop hover, hidden on mobile (use swipe) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveShift(shift.id);
            }}
            className="hidden md:flex opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 active:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-full transition-all absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 z-10 bg-white shadow-sm border border-red-100 items-center justify-center w-6 h-6"
            aria-label="Remove shift"
          >
            <span className="text-sm font-medium leading-none">×</span>
          </button>
        </div>
      </div>
    </div>
  );
});
