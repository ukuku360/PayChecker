import { getYear, isAfter, isBefore, addDays, startOfDay, addYears } from 'date-fns';
import type { Shift } from '../types';

/**
 * Returns the start and end date of the Australian Fiscal Year for a given date.
 * AU FY runs from July 1 to June 30.
 * e.g., Date(2023-10-15) -> Start: 2023-07-01, End: 2024-06-30
 * e.g., Date(2024-02-01) -> Start: 2023-07-01, End: 2024-06-30
 */
export const getFiscalYearRange = (date: Date = new Date()): { start: Date; end: Date; label: string } => {
  const year = getYear(date);
  const isSecondHalf = date.getMonth() >= 6; // July(6) - Dec(11)

  const startYear = isSecondHalf ? year : year - 1;
  const endYear = startYear + 1;

  const start = new Date(startYear, 6, 1); // July 1st
  const end = new Date(endYear, 5, 30); // June 30th

  return {
    start,
    end,
    label: `FY${endYear.toString().slice(-2)} (${startYear}-${endYear})`
  };
};

/**
 * Groups shifts into fortnightly periods starting from FY Start (July 1st).
 * This is used to estimate PAYG withholding, which is calculated per pay cycle (usually fortnightly).
 */
export const groupShiftsByFortnightYTD = (shifts: Shift[], fyStart: Date) => {
  // Sort shifts by date
  const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));
  
  // Filter shifts that are within the FY
  // Note: We'll do a loose filter here, assuming caller provides relevant range or we filter inside loop
  const fyEnd = addYears(fyStart, 1);
  
  const relevantShifts = sortedShifts.filter(s => {
    const d = new Date(s.date);
    return isAfter(d, startOfDay(addDays(fyStart, -1))) && isBefore(d, fyEnd);
  });

  const fortnights: { start: Date; end: Date; shifts: Shift[] }[] = [];
  
  // Create 26/27 absolute fortnights for the year
  // Real world is messy, but for estimation, strict 14-day chunks from July 1 works best for consistency
  let currentStart = fyStart;

  while (isBefore(currentStart, fyEnd)) {
    const currentEnd = addDays(currentStart, 13);
    
    // Optimized: Only process if it's in the past or near future (optimization? nah, let's just do all for the FY to project)
    // Actually, for YTD (Year To Date), we technically only care about past/current.
    // But for "Projection", we might want full year. 
    // Let's stick to returning *populated* or *passed* fortnights for now?
    // No, let's just return mapped shifts.
    
    const periodShifts = relevantShifts.filter(s => {
      const d = new Date(s.date);
      return (isAfter(d, startOfDay(addDays(currentStart, -1))) || d.getTime() === currentStart.getTime()) && 
             (isBefore(d, endOfDay(currentEnd)) || d.getTime() === currentEnd.getTime());
    });

    fortnights.push({
      start: currentStart,
      end: currentEnd,
      shifts: periodShifts
    });

    currentStart = addDays(currentStart, 14);
  }

  return fortnights;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
