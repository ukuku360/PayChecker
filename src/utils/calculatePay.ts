import { isSaturday, isSunday } from 'date-fns';
import type { Shift, WageConfig } from '../types';
import { isPublicHoliday } from '../data/australianHolidays';

export const calculateShiftPay = (shift: Shift, wageConfig: WageConfig, holidays: string[] = []) => {
  const date = new Date(shift.date);
  // Check both custom holidays from store AND automatic VIC public holidays
  const isHoliday = holidays.includes(shift.date) || isPublicHoliday(shift.date);
  const isWeekendSat = isSaturday(date);
  const isWeekendSun = isSunday(date);
  
  const rates = wageConfig[shift.type];
  let hourlyRate = rates.weekday;

  if (isHoliday) {
    hourlyRate = rates.holiday;
  } else if (isWeekendSun) {
    hourlyRate = rates.sunday;
  } else if (isWeekendSat) {
    hourlyRate = rates.saturday;
  }

  const basePay = (shift.hours || 0) * hourlyRate;

  return basePay;
};

export const calculateTotalPay = (shifts: Shift[], wageConfig: WageConfig, holidays: string[] = []) => {
  return shifts.reduce((total, shift) => {
    return total + calculateShiftPay(shift, wageConfig, holidays);
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
