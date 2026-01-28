import { isSaturday, isSunday } from 'date-fns';
import type { Shift, JobConfig } from '../types';
import { isPublicHoliday } from '../data/australianHolidays';

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

  // Find the latest rate history item that is effective on or before the date
  // Sort by date descending efficiently? 
  // Ideally rateHistory should be sorted, but let's sort to be safe or find efficiently.
  // Given low volume, simple filter & sort is fine
  const sortedHistory = [...job.rateHistory].sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  const effectiveRate = sortedHistory.find(history => 
    new Date(history.effectiveDate) <= new Date(dateString)
  );

  return effectiveRate ? effectiveRate.rates : job.hourlyRates; // Fallback to current if no history matches (or maybe 0?)
};

export const calculateShiftPay = (shift: Shift, jobConfigs: JobConfig[], holidays: string[] = []) => {
  const job = jobConfigs.find(j => j.id === shift.type);
  if (!job) return 0;

  const date = new Date(shift.date);
  // Check both custom holidays from store AND automatic VIC public holidays
  const isHoliday = holidays.includes(shift.date) || isPublicHoliday(shift.date);
  const isWeekendSat = isSaturday(date);
  const isWeekendSun = isSunday(date);
  
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

export const calculateTotalPay = (shifts: Shift[], jobConfigs: JobConfig[], holidays: string[] = []) => {
  return shifts.reduce((total, shift) => {
    return total + calculateShiftPay(shift, jobConfigs, holidays);
  }, 0);
};

export const calculateFortnightlyHours = (shifts: Shift[]) => {
  // Group shifts by week (Monday to Sunday)
  const weeklyHours: { [weekStart: string]: number } = {};

  shifts.forEach(shift => {
    const date = new Date(shift.date);
    // Get the Monday of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];

    weeklyHours[mondayStr] = (weeklyHours[mondayStr] || 0) + shift.hours;
  });

  const sortedWeeks = Object.keys(weeklyHours).sort();
  
  // For each week, calculate the total of that week and the next week
  return sortedWeeks.map((weekStart) => {
    const currentWeekHours = weeklyHours[weekStart] || 0;
    
    // Find the next week's Monday
    const nextMonday = new Date(weekStart);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const nextMondayStr = nextMonday.toISOString().split('T')[0];
    const nextWeekHours = weeklyHours[nextMondayStr] || 0;

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
