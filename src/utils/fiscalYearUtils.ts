import { getYear, isAfter, isBefore, addDays, startOfDay, addYears } from 'date-fns';
import type { Shift } from '../types';
import type { CountryCode } from '../data/countries';
import { parseLocalDate, formatLocalDate, isDateInRange } from './dateUtils';

/**
 * Returns the start and end date of the Fiscal Year for a given date and country.
 * AU FY runs from July 1 to June 30.
 * KR FY runs from Jan 1 to Dec 31.
 */
export const getFiscalYearRange = (date: Date = new Date(), country: CountryCode = 'AU'): { start: Date; end: Date; label: string } => {
  const year = getYear(date);

  if (country === 'KR') {
    const start = new Date(year, 0, 1); // Jan 1st
    const end = new Date(year, 11, 31); // Dec 31st
    return {
        start,
        end,
        label: `${year}년`
    };
  }

  // Australia Default
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
  // Sort shifts by date using string comparison
  const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));

  // Filter shifts that are within the FY using string comparison
  const fyEnd = addYears(fyStart, 1);
  const fyStartStr = formatLocalDate(fyStart);
  const fyEndStr = formatLocalDate(fyEnd);

  const relevantShifts = sortedShifts.filter((s) =>
    isDateInRange(s.date, fyStartStr, fyEndStr)
  );

  const fortnights: { start: Date; end: Date; shifts: Shift[] }[] = [];

  // Create 26/27 absolute fortnights for the year
  let currentStart = fyStart;

  while (isBefore(currentStart, fyEnd)) {
    const currentEnd = addDays(currentStart, 13);
    const currentStartStr = formatLocalDate(currentStart);
    const currentEndStr = formatLocalDate(currentEnd);

    // Filter shifts in this fortnight using string comparison
    const periodShifts = relevantShifts.filter((s) =>
      isDateInRange(s.date, currentStartStr, currentEndStr)
    );

    fortnights.push({
      start: currentStart,
      end: currentEnd,
      shifts: periodShifts,
    });

    currentStart = addDays(currentStart, 14);
  }

  return fortnights;
};

// endOfDay is no longer needed - string comparison is used instead
