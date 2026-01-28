/**
 * Korean Public Holidays (대한민국 공휴일)
 * Data for 2025-2026
 *
 * Reference: https://www.law.go.kr (관공서의 공휴일에 관한 규정)
 * Note: Lunar calendar holidays (설날, 추석) vary by year
 */

import type { PublicHoliday } from './australia';

// Korean Public Holidays 2025 (대한민국 공휴일 2025년)
export const KR_HOLIDAYS_2025: PublicHoliday[] = [
  { date: '2025-01-01', name: "New Year's Day", nameKo: '신정' },
  { date: '2025-01-28', name: 'Lunar New Year Eve', nameKo: '설날 연휴' },
  { date: '2025-01-29', name: 'Lunar New Year', nameKo: '설날' },
  { date: '2025-01-30', name: 'Lunar New Year Day 2', nameKo: '설날 연휴' },
  { date: '2025-03-01', name: 'Independence Movement Day', nameKo: '삼일절' },
  { date: '2025-05-05', name: "Children's Day", nameKo: '어린이날' },
  { date: '2025-05-06', name: "Buddha's Birthday", nameKo: '부처님 오신 날' },
  { date: '2025-06-06', name: 'Memorial Day', nameKo: '현충일' },
  { date: '2025-08-15', name: 'Liberation Day', nameKo: '광복절' },
  { date: '2025-10-05', name: 'Chuseok Eve', nameKo: '추석 연휴' },
  { date: '2025-10-06', name: 'Chuseok', nameKo: '추석' },
  { date: '2025-10-07', name: 'Chuseok Day 2', nameKo: '추석 연휴' },
  { date: '2025-10-08', name: 'Substitute Holiday', nameKo: '대체공휴일' },
  { date: '2025-10-03', name: 'National Foundation Day', nameKo: '개천절' },
  { date: '2025-10-09', name: 'Hangul Day', nameKo: '한글날' },
  { date: '2025-12-25', name: 'Christmas Day', nameKo: '성탄절' },
];

// Korean Public Holidays 2026 (대한민국 공휴일 2026년)
export const KR_HOLIDAYS_2026: PublicHoliday[] = [
  { date: '2026-01-01', name: "New Year's Day", nameKo: '신정' },
  { date: '2026-02-16', name: 'Lunar New Year Eve', nameKo: '설날 연휴' },
  { date: '2026-02-17', name: 'Lunar New Year', nameKo: '설날' },
  { date: '2026-02-18', name: 'Lunar New Year Day 2', nameKo: '설날 연휴' },
  { date: '2026-03-01', name: 'Independence Movement Day', nameKo: '삼일절' },
  { date: '2026-03-02', name: 'Substitute Holiday', nameKo: '대체공휴일' },
  { date: '2026-05-05', name: "Children's Day", nameKo: '어린이날' },
  { date: '2026-05-24', name: "Buddha's Birthday", nameKo: '부처님 오신 날' },
  { date: '2026-05-25', name: 'Substitute Holiday', nameKo: '대체공휴일' },
  { date: '2026-06-06', name: 'Memorial Day', nameKo: '현충일' },
  { date: '2026-08-15', name: 'Liberation Day', nameKo: '광복절' },
  { date: '2026-08-17', name: 'Substitute Holiday', nameKo: '대체공휴일' },
  { date: '2026-09-24', name: 'Chuseok Eve', nameKo: '추석 연휴' },
  { date: '2026-09-25', name: 'Chuseok', nameKo: '추석' },
  { date: '2026-09-26', name: 'Chuseok Day 2', nameKo: '추석 연휴' },
  { date: '2026-10-03', name: 'National Foundation Day', nameKo: '개천절' },
  { date: '2026-10-09', name: 'Hangul Day', nameKo: '한글날' },
  { date: '2026-12-25', name: 'Christmas Day', nameKo: '성탄절' },
];

// Combined holidays
export const ALL_KR_HOLIDAYS: PublicHoliday[] = [
  ...KR_HOLIDAYS_2025,
  ...KR_HOLIDAYS_2026,
];
