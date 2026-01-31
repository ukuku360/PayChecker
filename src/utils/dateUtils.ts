/**
 * Date Utilities - Timezone-Safe Date Handling
 *
 * CORRECTNESS CRITERIA:
 * - All YYYY-MM-DD strings represent LOCAL CALENDAR DATES (not UTC instants)
 * - Week starts on Sunday (Australian student visa standard)
 * - Date ranges are inclusive (start <= date <= end)
 * - shift.hours = total work time; calculatePaidHours() computes paid time
 * - Visa calculations use paid hours (after break deduction)
 */

/**
 * Parse a YYYY-MM-DD string as a local calendar date (midnight local time)
 * IMPORTANT: Do NOT use new Date("YYYY-MM-DD") as it parses as UTC
 */
export function parseLocalDate(dateStr: string): Date {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD string (local calendar date)
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Alias for formatLocalDate - converts Date to YYYY-MM-DD key
 */
export function toDateKey(date: Date): string {
  return formatLocalDate(date);
}

/**
 * Validate that a string is a valid YYYY-MM-DD format
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);

  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Create a date and verify it matches (catches invalid dates like Feb 30)
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Get the Sunday of the week for a given date (week starts Sunday)
 * Used for Australian student visa fortnight calculations
 */
export function getWeekStartSunday(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Get the Sunday of the week from a date string
 */
export function getWeekStartSundayFromString(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const sunday = getWeekStartSunday(date);
  return formatLocalDate(sunday);
}

/**
 * Add days to a date (returns new Date object)
 */
export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add days to a date string (returns new date string)
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  const result = addDaysToDate(date, days);
  return formatLocalDate(result);
}

/**
 * Compare two date strings (YYYY-MM-DD format)
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareDateStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Check if dateStr is within range [startStr, endStr] (inclusive)
 */
export function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  return dateStr >= startStr && dateStr <= endStr;
}

/**
 * Check if two date ranges overlap
 * Both ranges are inclusive [start, end]
 */
export function doRangesOverlap(
  range1Start: string,
  range1End: string,
  range2Start: string,
  range2End: string
): boolean {
  return range1Start <= range2End && range1End >= range2Start;
}

/**
 * Safely parse a date string, returning null if invalid
 * Use this when you need to handle potentially invalid input gracefully
 */
export function tryParseLocalDate(dateStr: string): Date | null {
  try {
    if (!isValidDateString(dateStr)) return null;
    return parseLocalDate(dateStr);
  } catch {
    return null;
  }
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday) from a date string
 */
export function getDayOfWeek(dateStr: string): number {
  const date = parseLocalDate(dateStr);
  return date.getDay();
}

/**
 * Check if a date string is a Saturday
 */
export function isSaturdayDate(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 6;
}

/**
 * Check if a date string is a Sunday
 */
export function isSundayDate(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 0;
}

/**
 * Check if a date string is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr: string): boolean {
  const day = getDayOfWeek(dateStr);
  return day === 0 || day === 6;
}
