/**
 * Australian Public Holidays - Victoria (VIC) / Melbourne
 *
 * This file re-exports from the modular holidays structure for backward compatibility.
 * New code should import from './holidays/index' directly.
 */

// Re-export everything from the new modular structure
export { ALL_VIC_HOLIDAYS, VIC_HOLIDAYS_2025, VIC_HOLIDAYS_2026 } from './holidays/australia';
export type { PublicHoliday } from './holidays/australia';

// Import for local use
import { ALL_VIC_HOLIDAYS } from './holidays/australia';
import type { PublicHoliday } from './holidays/australia';

// Legacy helper functions for backward compatibility (Australia-only versions)
export const isPublicHoliday = (dateStr: string): boolean => {
  return ALL_VIC_HOLIDAYS.some((h) => h.date === dateStr);
};

export const getHolidayInfo = (dateStr: string): PublicHoliday | undefined => {
  return ALL_VIC_HOLIDAYS.find((h) => h.date === dateStr);
};

export const getHolidayDates = (): string[] => {
  return ALL_VIC_HOLIDAYS.map((h) => h.date);
};
