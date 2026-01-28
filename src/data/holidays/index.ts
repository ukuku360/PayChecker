/**
 * Holiday Data Factory
 *
 * Returns country-specific holiday data based on country code
 */

import type { CountryCode } from '../countries';
import { ALL_VIC_HOLIDAYS, type PublicHoliday } from './australia';
import { ALL_KR_HOLIDAYS } from './korea';

// Re-export types
export type { PublicHoliday };

// Get holidays by country
export const getHolidaysByCountry = (country: CountryCode): PublicHoliday[] => {
  switch (country) {
    case 'KR':
      return ALL_KR_HOLIDAYS;
    case 'AU':
    default:
      return ALL_VIC_HOLIDAYS;
  }
};

// Check if a date is a public holiday for a specific country
export const isPublicHoliday = (dateStr: string, country: CountryCode): boolean => {
  const holidays = getHolidaysByCountry(country);
  return holidays.some((h) => h.date === dateStr);
};

// Get holiday info for a specific country
export const getHolidayInfo = (dateStr: string, country: CountryCode): PublicHoliday | undefined => {
  const holidays = getHolidaysByCountry(country);
  return holidays.find((h) => h.date === dateStr);
};

// Get holiday name in appropriate language
export const getHolidayName = (holiday: PublicHoliday, language: 'en' | 'ko'): string => {
  if (language === 'ko' && holiday.nameKo) {
    return holiday.nameKo;
  }
  return holiday.name;
};

// Get all holiday dates as string array for a country
export const getHolidayDates = (country: CountryCode): string[] => {
  return getHolidaysByCountry(country).map((h) => h.date);
};

// Re-export Australian holidays for backward compatibility
export { ALL_VIC_HOLIDAYS, VIC_HOLIDAYS_2025, VIC_HOLIDAYS_2026 } from './australia';
export { ALL_KR_HOLIDAYS, KR_HOLIDAYS_2025, KR_HOLIDAYS_2026 } from './korea';
