// src/components/Calendar/hooks/useDayCellLogic.ts
import { useState, useCallback } from 'react';
import { useScheduleStore } from '../../../store/useScheduleStore';
import { useDroppable } from '@dnd-kit/core';
import { format, isWeekend } from 'date-fns';
import { calculateTotalHours } from '../../../utils/timeUtils';
import type { Shift } from '../../../types';

export type PopupPosition = { top: number; left: number; openAbove?: boolean };

export type PopupState =
  | { type: 'none' }
  | { type: 'jobPicker'; position: PopupPosition }
  | { type: 'noteEditor'; shiftId: string; position: PopupPosition }
  | { type: 'timeEditor'; shiftId: string; position: PopupPosition };

export const useDayCellLogic = (date: Date, shifts: Shift[], onAddShift: (shift: Shift) => void, onUpdateShift: (id: string, update: Partial<Shift>) => void) => {
  const {
    jobConfigs,
    holidays,
    copiedShifts,
    setCopiedShifts,
    templates,
    addTemplate,
    removeTemplate,
  } = useScheduleStore();

  const dateStr = format(date, 'yyyy-MM-dd');
  const [popupState, setPopupState] = useState<PopupState>({ type: 'none' });

  const closePopup = useCallback(() => setPopupState({ type: 'none' }), []);

  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-day-${dateStr}`,
    data: { date: dateStr },
  });

  const calculatePopupPosition = (target: HTMLElement): PopupPosition => {
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    const POPUP_WIDTH = 240;
    const POPUP_HEIGHT = 320;
    const PADDING = 16;

    let top = rect.top;
    let left = rect.left + rect.width / 2;

    // Determine if popup should open above or below
    const openAbove = rect.top - POPUP_HEIGHT >= PADDING;
    if (!openAbove) {
      top = rect.bottom + 10;
    } else {
      top = rect.top - 10;
    }

    // Horizontal boundary checks
    const halfWidth = POPUP_WIDTH / 2;
    if (left - halfWidth < PADDING) {
      left = halfWidth + PADDING;
    } else if (left + halfWidth > viewportWidth - PADDING) {
      left = viewportWidth - halfWidth - PADDING;
    }

    return { top, left, openAbove };
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    setPopupState({ type: 'jobPicker', position: calculatePopupPosition(target) });
  };

  const handleJobSelect = (jobId: string) => {
    const job = jobConfigs.find((j) => j.id === jobId);
    if (!job) return;
    const isWeekendDay = isWeekend(date);
    const isHoliday = holidays.includes(dateStr);

    let hours =
      isWeekendDay || isHoliday
        ? job.defaultHours.weekend
        : job.defaultHours.weekday;
    const startTime = job.defaultStartTime;
    const endTime = job.defaultEndTime;

    if (startTime && endTime) {
      hours = calculateTotalHours(startTime, endTime) || 0;
    }

    onAddShift({
      id: `${dateStr}-${jobId}-${Date.now()}`,
      date: dateStr,
      type: jobId,
      hours,
      note: '',
      startTime,
      endTime,
    });
    closePopup();
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const hours = calculateTotalHours(template.startTime, template.endTime) || 0;

    onAddShift({
      id: `${dateStr}-${template.jobId}-${Date.now()}`,
      date: dateStr,
      type: template.jobId,
      hours,
      note: '',
      startTime: template.startTime,
      endTime: template.endTime,
      breakMinutes: template.breakMinutes,
    });
    closePopup();
  };

  const handleSaveAsTemplate = () => {
    if (popupState.type !== 'timeEditor') return;
    const shift = shifts.find((s) => s.id === popupState.shiftId);
    if (!shift) return;

    const name = prompt("Enter template name (e.g., 'Morning Shift')");
    if (!name) return;

    const job = jobConfigs.find((j) => j.id === shift.type);
    const startTime = shift.startTime || job?.defaultStartTime || '09:00';
    const endTime = shift.endTime || job?.defaultEndTime || '17:00';
    const breakMinutes = shift.breakMinutes ?? job?.defaultBreakMinutes ?? 0;

    addTemplate({
      id: `tpl-${Date.now()}`,
      name,
      jobId: shift.type,
      startTime,
      endTime,
      breakMinutes,
    });
  };

  const handlePaste = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!copiedShifts || copiedShifts.length === 0) return;

      // Optimize search: Create a map of existing shifts by type for O(1) lookup
      const existingShiftsMap = new Map(shifts.map(s => [s.type, s]));

      copiedShifts.forEach((copied) => {
        const existingShift = existingShiftsMap.get(copied.type);
        if (existingShift) {
          onUpdateShift(existingShift.id, {
            hours: copied.hours,
            note: copied.note,
            startTime: copied.startTime,
            endTime: copied.endTime,
            breakMinutes: copied.breakMinutes,
          });
        } else {
          onAddShift({
            id: `${dateStr}-${copied.type}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            date: dateStr,
            type: copied.type,
            hours: copied.hours,
            note: copied.note,
            startTime: copied.startTime,
            endTime: copied.endTime,
            breakMinutes: copied.breakMinutes,
          });
        }
      });
  };

  const handleCopy = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const shiftsToCopy = shifts.map((s) => ({
        type: s.type,
        hours: s.hours,
        note: s.note,
        startTime: s.startTime,
        endTime: s.endTime,
        breakMinutes: s.breakMinutes,
      }));
      setCopiedShifts(shiftsToCopy);
  };

  return {
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
  };
};
