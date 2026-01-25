/**
 * Australian Public Holidays - Victoria (VIC) / Melbourne
 * Data for 2025-2026
 * 
 * Reference: https://www.vic.gov.au/victorian-public-holidays
 */

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  nameKo?: string; // Translation
}

// Victoria Public Holidays 2025
export const VIC_HOLIDAYS_2025: PublicHoliday[] = [
  { date: '2025-01-01', name: "New Year's Day", nameKo: "New Year's Day" },
  { date: '2025-01-27', name: 'Australia Day', nameKo: 'Australia Day' }, // Observed Monday
  { date: '2025-03-10', name: 'Labour Day', nameKo: 'Labour Day' },
  { date: '2025-04-18', name: 'Good Friday', nameKo: 'Good Friday' },
  { date: '2025-04-19', name: 'Saturday before Easter Sunday', nameKo: 'Saturday before Easter Sunday' },
  { date: '2025-04-21', name: 'Easter Monday', nameKo: 'Easter Monday' },
  { date: '2025-04-25', name: 'ANZAC Day', nameKo: 'ANZAC Day' },
  { date: '2025-06-09', name: "King's Birthday", nameKo: "King's Birthday" },
  { date: '2025-09-26', name: 'Friday before AFL Grand Final', nameKo: 'Friday before AFL Grand Final' },
  { date: '2025-11-04', name: 'Melbourne Cup Day', nameKo: 'Melbourne Cup Day' },
  { date: '2025-12-25', name: 'Christmas Day', nameKo: 'Christmas Day' },
  { date: '2025-12-26', name: 'Boxing Day', nameKo: 'Boxing Day' },
];

// Victoria Public Holidays 2026
export const VIC_HOLIDAYS_2026: PublicHoliday[] = [
  { date: '2026-01-01', name: "New Year's Day", nameKo: "New Year's Day" },
  { date: '2026-01-26', name: 'Australia Day', nameKo: 'Australia Day' },
  { date: '2026-03-09', name: 'Labour Day', nameKo: 'Labour Day' },
  { date: '2026-04-03', name: 'Good Friday', nameKo: 'Good Friday' },
  { date: '2026-04-04', name: 'Saturday before Easter Sunday', nameKo: 'Saturday before Easter Sunday' },
  { date: '2026-04-06', name: 'Easter Monday', nameKo: 'Easter Monday' },
  { date: '2026-04-25', name: 'ANZAC Day', nameKo: 'ANZAC Day' },
  { date: '2026-06-08', name: "King's Birthday", nameKo: "King's Birthday" },
  { date: '2026-09-25', name: 'Friday before AFL Grand Final', nameKo: 'Friday before AFL Grand Final' },
  { date: '2026-11-03', name: 'Melbourne Cup Day', nameKo: 'Melbourne Cup Day' },
  { date: '2026-12-25', name: 'Christmas Day', nameKo: 'Christmas Day' },
  { date: '2026-12-28', name: 'Boxing Day', nameKo: 'Boxing Day' }, // Observed Monday
];

// Combined holidays map for easy lookup
export const ALL_VIC_HOLIDAYS: PublicHoliday[] = [
  ...VIC_HOLIDAYS_2025,
  ...VIC_HOLIDAYS_2026,
];

// Helper function to check if a date is a public holiday
export const isPublicHoliday = (dateStr: string): boolean => {
  return ALL_VIC_HOLIDAYS.some(h => h.date === dateStr);
};

// Helper function to get holiday info
export const getHolidayInfo = (dateStr: string): PublicHoliday | undefined => {
  return ALL_VIC_HOLIDAYS.find(h => h.date === dateStr);
};

// Get all holiday dates as string array (for compatibility with existing code)
export const getHolidayDates = (): string[] => {
  return ALL_VIC_HOLIDAYS.map(h => h.date);
};
