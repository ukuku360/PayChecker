import type { Shift, JobConfig } from '../types';
import type { CountryCode } from '../data/countries';
import { isPublicHoliday } from '../data/holidays';
import {
  parseLocalDate,
  formatLocalDate,
  getWeekStartSunday,
  addDaysToDate,
  isSaturdayDate,
  isSundayDate,
} from './dateUtils';

/**
 * Calculate paid hours for a shift, accounting for break deductions
 * Break is always deducted if configured (no threshold)
 */
export const calculatePaidHours = (shift: Shift, jobConfigs: JobConfig[]): number => {
  const job = jobConfigs.find(j => j.id === shift.type);
  if (!job) return shift.hours;

  // Use event-level breakMinutes override if set, otherwise fall back to job default
  const breakMinutes = shift.breakMinutes ?? job.defaultBreakMinutes ?? 0;
  if (breakMinutes === 0) {
    return shift.hours;
  }

  const breakHours = breakMinutes / 60;
  return Math.max(0, Math.round((shift.hours - breakHours) * 100) / 100);
};

const getRateForDate = (job: JobConfig, dateString: string) => {
  if (!job.rateHistory || job.rateHistory.length === 0) {
    return job.hourlyRates;
  }

  // Sort by date descending using string comparison (YYYY-MM-DD sorts correctly)
  const sortedHistory = [...job.rateHistory].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate)
  );

  // Find the latest rate effective on or before the date
  const effectiveRate = sortedHistory.find(
    (history) => history.effectiveDate <= dateString
  );

  return effectiveRate ? effectiveRate.rates : job.hourlyRates;
};

/**
 * Calculate pay for a single shift
 * @param shift - The shift to calculate pay for
 * @param jobConfigs - Job configurations
 * @param holidays - Custom holiday dates from user settings
 * @param country - Country code for public holiday detection (defaults to 'AU')
 */
export const calculateShiftPay = (
  shift: Shift,
  jobConfigs: JobConfig[],
  holidays: string[] = [],
  country: CountryCode = 'AU'
) => {
  const job = jobConfigs.find((j) => j.id === shift.type);
  if (!job) return 0;

  // Check custom holidays AND country-specific public holidays
  const isHoliday = holidays.includes(shift.date) || isPublicHoliday(shift.date, country);
  const isWeekendSat = isSaturdayDate(shift.date);
  const isWeekendSun = isSundayDate(shift.date);

  const rates = getRateForDate(job, shift.date);
  let hourlyRate = rates.weekday;

  if (isHoliday) {
    hourlyRate = rates.holiday;
  } else if (isWeekendSun) {
    hourlyRate = rates.sunday;
  } else if (isWeekendSat) {
    hourlyRate = rates.saturday;
  }

  // Use paid hours (after break deduction) for pay calculation
  const paidHours = calculatePaidHours(shift, jobConfigs);
  const basePay = paidHours * hourlyRate;

  return basePay;
};

/**
 * Calculate total pay for multiple shifts
 * @param shifts - Array of shifts
 * @param jobConfigs - Job configurations
 * @param holidays - Custom holiday dates from user settings
 * @param country - Country code for public holiday detection (defaults to 'AU')
 */
export const calculateTotalPay = (
  shifts: Shift[],
  jobConfigs: JobConfig[],
  holidays: string[] = [],
  country: CountryCode = 'AU'
) => {
  return shifts.reduce((total, shift) => {
    return total + calculateShiftPay(shift, jobConfigs, holidays, country);
  }, 0);
};

/**
 * Calculate fortnightly hours for student visa compliance
 * Groups shifts by Sunday-Saturday weeks (Australian standard)
 */
export const calculateFortnightlyHours = (shifts: Shift[], jobConfigs: JobConfig[] = []) => {
  // Group shifts by week (Sunday to Saturday - Australian standard for student visa)
  const weeklyHours: { [weekStart: string]: number } = {};

  shifts.forEach((shift) => {
    // Use timezone-safe date parsing
    const date = parseLocalDate(shift.date);
    const sunday = getWeekStartSunday(date);
    const sundayStr = formatLocalDate(sunday);

    const hours = jobConfigs.length > 0 ? calculatePaidHours(shift, jobConfigs) : shift.hours;
    weeklyHours[sundayStr] = (weeklyHours[sundayStr] || 0) + hours;
  });

  const sortedWeeks = Object.keys(weeklyHours).sort();

  // For each week, calculate the total of that week and the next week
  return sortedWeeks.map((weekStart) => {
    const currentWeekHours = weeklyHours[weekStart] || 0;

    // Find the next week's Sunday using timezone-safe utilities
    const sunday = parseLocalDate(weekStart);
    const nextSunday = addDaysToDate(sunday, 7);
    const nextSundayStr = formatLocalDate(nextSunday);
    const nextWeekHours = weeklyHours[nextSundayStr] || 0;

    const totalHours = currentWeekHours + nextWeekHours;

    return {
      periodStart: weekStart,
      totalHours: totalHours,
      remainingHours: Math.max(0, 48 - totalHours),
      week1Hours: currentWeekHours,
      week2Hours: nextWeekHours,
    };
  });
};
