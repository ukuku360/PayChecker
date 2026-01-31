// src/components/JobBar/hooks/useHourlyRateLogic.ts
import { useState } from 'react';
import { format } from 'date-fns';
import type { JobConfig, RateHistoryItem } from '../../../types';
import { isValidDateString } from '../../../utils/dateUtils';

export const useHourlyRateLogic = (
  job: JobConfig,
  onSave: (id: string, config: Partial<JobConfig>) => void,
  onClose: () => void,
  onDelete?: (id: string) => void
) => {
  const [rates, setRates] = useState(job.hourlyRates);
  const [defaultHours, setDefaultHours] = useState({
      weekday: job.defaultHours?.weekday ?? 0,
      weekend: job.defaultHours?.weekend ?? 0
  });
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rateHistory] = useState<RateHistoryItem[]>(job.rateHistory || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [breakHours, setBreakHours] = useState((job.defaultBreakMinutes ?? 0) / 60);
  const [defaultStartTime, setDefaultStartTime] = useState(job.defaultStartTime || '');
  const [defaultEndTime, setDefaultEndTime] = useState(job.defaultEndTime || '');
  const [breakError, setBreakError] = useState<string | null>(null);

  // Validate break time doesn't exceed shift duration
  const validateBreakTime = (breakHrs: number) => {
    // Fixed: Handle empty string as 0 to avoid coercion issues
    const weekdayHours = typeof defaultHours.weekday === 'number' && defaultHours.weekday > 0 ? defaultHours.weekday : Infinity;
    const weekendHours = typeof defaultHours.weekend === 'number' && defaultHours.weekend > 0 ? defaultHours.weekend : Infinity;
    const minShiftHours = Math.min(weekdayHours, weekendHours);

    if (minShiftHours !== Infinity && breakHrs >= minShiftHours) {
      setBreakError(`Break (${breakHrs}h) cannot exceed shift duration (${minShiftHours}h)`);
      return false;
    }
    setBreakError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateBreakTime(breakHours)) return;

    // Validate date format using dateUtils
    if (!isValidDateString(effectiveDate)) {
      return; // Invalid date
    }

    // Sanitize rates to prevent NaN (convert empty strings to 0)
    const sanitizedRates = {
      weekday: Number(rates.weekday) || 0,
      saturday: Number(rates.saturday) || 0,
      sunday: Number(rates.sunday) || 0,
      holiday: Number(rates.holiday) || 0,
    };

    // Logic:
    // 1. Create a RateHistoryItem for the current inputs
    const newHistoryItem: RateHistoryItem = {
      effectiveDate: effectiveDate,
      rates: sanitizedRates,
    };

    // 2. Merge with existing history
    // Remove any existing entry for the same date to avoid duplicates
    const filteredHistory = rateHistory.filter((h) => h.effectiveDate !== effectiveDate);
    // Sort by date descending using string comparison (YYYY-MM-DD sorts correctly)
    const updatedHistory = [...filteredHistory, newHistoryItem].sort((a, b) =>
      b.effectiveDate.localeCompare(a.effectiveDate)
    );

    // 3. Determine if the new rate should update the current hourlyRates
    // If we are adding a future rate, we shouldn't update 'hourlyRates' if it represents "current".
    // But if we are adding a past/today rate, we should.
    // Simple heuristic: If the new effective date is <= today, update the main hourlyRates too.
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isRateEffectiveNow = effectiveDate <= todayStr;
    const ratesToSave = isRateEffectiveNow ? sanitizedRates : job.hourlyRates;

    onSave(job.id, {
        hourlyRates: ratesToSave,
        defaultHours: defaultHours,
        rateHistory: updatedHistory,
        defaultBreakMinutes: breakHours > 0 ? breakHours * 60 : undefined,
        defaultStartTime: defaultStartTime || undefined,
        defaultEndTime: defaultEndTime || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(job.id);
      onClose();
    }
  };

  const handleRateChange = (key: keyof typeof rates, value: string) => {
      // Fixed: Empty string becomes 0 to prevent NaN in calculations
      if (value === '') {
        setRates(prev => ({ ...prev, [key]: 0 }));
        return;
      }
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        setRates(prev => ({ ...prev, [key]: parsed }));
      }
  };

  const handleHoursChange = (key: keyof typeof defaultHours, value: string) => {
      // Fixed: Empty string becomes 0 to prevent NaN in calculations
      if (value === '') {
        setDefaultHours(prev => ({ ...prev, [key]: 0 }));
        return;
      }
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        setDefaultHours(prev => ({ ...prev, [key]: parsed }));
      }
  };

  const handleHistoryItemClick = (item: RateHistoryItem) => {
      setRates(item.rates);
      setEffectiveDate(item.effectiveDate);
      setShowHistory(false);
  };

  return {
    rates,
    setRates,
    defaultHours,
    setDefaultHours,
    effectiveDate,
    setEffectiveDate,
    rateHistory,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showHistory,
    setShowHistory,
    breakHours,
    setBreakHours,
    defaultStartTime,
    setDefaultStartTime,
    defaultEndTime,
    setDefaultEndTime,
    breakError,
    validateBreakTime,
    handleSave,
    handleDelete,
    handleRateChange,
    handleHoursChange,
    handleHistoryItemClick
  };
};
