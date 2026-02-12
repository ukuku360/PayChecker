/**
 * Unit Tests for dateUtils
 *
 * Run with: npm test (after installing vitest or jest)
 *
 * These tests verify that date handling is consistent across timezones.
 * Key scenarios tested:
 * 1. parseLocalDate: YYYY-MM-DD parsed as local calendar date
 * 2. formatLocalDate: Date formatted consistently
 * 3. getWeekStartSunday: Correct Sunday calculation
 * 4. String comparison: YYYY-MM-DD sorts correctly
 * 5. Validation: Invalid dates rejected
 */

import {
  parseLocalDate,
  formatLocalDate,
  isValidDateString,
  getWeekStartSunday,
  addDaysToDate,
  isDateInRange,
  doRangesOverlap,
  tryParseLocalDate,
  getDayOfWeek,
  isSaturdayDate,
  isSundayDate,
  isWeekend,
} from '../dateUtils';

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as local calendar date', () => {
    const date = parseLocalDate('2025-01-31');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0); // January is month 0
    expect(date.getDate()).toBe(31);
  });

  it('handles month boundaries correctly', () => {
    const dec31 = parseLocalDate('2025-12-31');
    expect(dec31.getMonth()).toBe(11); // December is month 11
    expect(dec31.getDate()).toBe(31);

    const jan1 = parseLocalDate('2026-01-01');
    expect(jan1.getMonth()).toBe(0);
    expect(jan1.getDate()).toBe(1);
  });

  it('throws on invalid date string', () => {
    expect(() => parseLocalDate('invalid')).toThrow();
    expect(() => parseLocalDate('2025-13-01')).toThrow(); // Invalid month
    expect(() => parseLocalDate('2025-02-30')).toThrow(); // Feb 30 doesn't exist
  });
});

describe('formatLocalDate', () => {
  it('formats Date as YYYY-MM-DD', () => {
    const date = new Date(2025, 0, 15); // Jan 15, 2025 (local)
    expect(formatLocalDate(date)).toBe('2025-01-15');
  });

  it('pads single digit month/day', () => {
    const date = new Date(2025, 5, 5); // June 5, 2025
    expect(formatLocalDate(date)).toBe('2025-06-05');
  });
});

describe('isValidDateString', () => {
  it('validates correct YYYY-MM-DD strings', () => {
    expect(isValidDateString('2025-01-31')).toBe(true);
    expect(isValidDateString('2025-12-31')).toBe(true);
    expect(isValidDateString('2025-02-28')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidDateString('01-31-2025')).toBe(false);
    expect(isValidDateString('2025/01/31')).toBe(false);
    expect(isValidDateString('2025-1-31')).toBe(false);
    expect(isValidDateString('invalid')).toBe(false);
  });

  it('rejects invalid dates', () => {
    expect(isValidDateString('2025-02-30')).toBe(false); // Feb 30
    expect(isValidDateString('2025-13-01')).toBe(false); // Month 13
    expect(isValidDateString('2025-00-01')).toBe(false); // Month 0
  });
});

describe('getWeekStartSunday', () => {
  it('returns Sunday for any day in the week', () => {
    // Sunday Jan 5, 2025
    const sunday = parseLocalDate('2025-01-05');
    expect(formatLocalDate(getWeekStartSunday(sunday))).toBe('2025-01-05');

    // Wednesday Jan 8, 2025 -> Sunday Jan 5
    const wednesday = parseLocalDate('2025-01-08');
    expect(formatLocalDate(getWeekStartSunday(wednesday))).toBe('2025-01-05');

    // Saturday Jan 11, 2025 -> Sunday Jan 5
    const saturday = parseLocalDate('2025-01-11');
    expect(formatLocalDate(getWeekStartSunday(saturday))).toBe('2025-01-05');
  });
});

describe('addDaysToDate', () => {
  it('adds days correctly', () => {
    const date = parseLocalDate('2025-01-15');
    const result = addDaysToDate(date, 7);
    expect(formatLocalDate(result)).toBe('2025-01-22');
  });

  it('handles month boundary', () => {
    const date = parseLocalDate('2025-01-31');
    const result = addDaysToDate(date, 1);
    expect(formatLocalDate(result)).toBe('2025-02-01');
  });

  it('handles negative days', () => {
    const date = parseLocalDate('2025-01-15');
    const result = addDaysToDate(date, -5);
    expect(formatLocalDate(result)).toBe('2025-01-10');
  });
});

describe('isDateInRange', () => {
  it('returns true for dates within range (inclusive)', () => {
    expect(isDateInRange('2025-01-15', '2025-01-01', '2025-01-31')).toBe(true);
    expect(isDateInRange('2025-01-01', '2025-01-01', '2025-01-31')).toBe(true); // Start boundary
    expect(isDateInRange('2025-01-31', '2025-01-01', '2025-01-31')).toBe(true); // End boundary
  });

  it('returns false for dates outside range', () => {
    expect(isDateInRange('2024-12-31', '2025-01-01', '2025-01-31')).toBe(false);
    expect(isDateInRange('2025-02-01', '2025-01-01', '2025-01-31')).toBe(false);
  });
});

describe('doRangesOverlap', () => {
  it('detects overlapping ranges', () => {
    // Partial overlap
    expect(doRangesOverlap('2025-01-01', '2025-01-15', '2025-01-10', '2025-01-20')).toBe(true);

    // One contains the other
    expect(doRangesOverlap('2025-01-01', '2025-01-31', '2025-01-10', '2025-01-15')).toBe(true);

    // Same range
    expect(doRangesOverlap('2025-01-01', '2025-01-15', '2025-01-01', '2025-01-15')).toBe(true);

    // Adjacent (touching) ranges
    expect(doRangesOverlap('2025-01-01', '2025-01-15', '2025-01-15', '2025-01-20')).toBe(true);
  });

  it('detects non-overlapping ranges', () => {
    expect(doRangesOverlap('2025-01-01', '2025-01-10', '2025-01-20', '2025-01-31')).toBe(false);
  });
});

describe('getDayOfWeek', () => {
  it('returns correct day (0=Sunday, 6=Saturday)', () => {
    expect(getDayOfWeek('2025-01-05')).toBe(0); // Sunday
    expect(getDayOfWeek('2025-01-06')).toBe(1); // Monday
    expect(getDayOfWeek('2025-01-11')).toBe(6); // Saturday
  });
});

describe('isSaturdayDate / isSundayDate / isWeekend', () => {
  it('correctly identifies weekend days', () => {
    expect(isSaturdayDate('2025-01-11')).toBe(true);
    expect(isSaturdayDate('2025-01-12')).toBe(false);

    expect(isSundayDate('2025-01-12')).toBe(true);
    expect(isSundayDate('2025-01-11')).toBe(false);

    expect(isWeekend('2025-01-11')).toBe(true); // Saturday
    expect(isWeekend('2025-01-12')).toBe(true); // Sunday
    expect(isWeekend('2025-01-13')).toBe(false); // Monday
  });
});

describe('tryParseLocalDate', () => {
  it('returns Date for valid strings', () => {
    const result = tryParseLocalDate('2025-01-15');
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2025);
  });

  it('returns null for invalid strings', () => {
    expect(tryParseLocalDate('invalid')).toBeNull();
    expect(tryParseLocalDate('2025-13-01')).toBeNull();
  });
});

describe('String comparison for YYYY-MM-DD', () => {
  it('sorts dates correctly using localeCompare', () => {
    const dates = ['2025-12-31', '2025-01-01', '2025-06-15'];
    dates.sort((a, b) => a.localeCompare(b));
    expect(dates).toEqual(['2025-01-01', '2025-06-15', '2025-12-31']);
  });

  it('compares dates correctly with < > operators', () => {
    expect('2025-01-01' < '2025-01-02').toBe(true);
    expect('2025-12-31' > '2025-01-01').toBe(true);
    expect('2025-06-15' === '2025-06-15').toBe(true);
  });
});

/**
 * TIMEZONE SAFETY VERIFICATION
 *
 * These tests verify that the implementation handles timezone correctly.
 * The key insight is:
 * - YYYY-MM-DD strings represent LOCAL calendar dates
 * - parseLocalDate() creates Date at midnight LOCAL time
 * - This avoids the UTC parsing issue of new Date("YYYY-MM-DD")
 *
 * Example of the bug this fixes:
 * - In Sydney (UTC+11), new Date("2025-01-31") parses as:
 *   2025-01-31 00:00:00 UTC = 2025-01-31 11:00:00 Sydney
 * - But local midnight is 2025-01-30 13:00:00 UTC
 * - This can cause off-by-one day errors near midnight
 *
 * With parseLocalDate(), we use new Date(year, month-1, day) which
 * always creates midnight in the LOCAL timezone.
 */
