/**
 * Time utility functions for shift calculations
 */

/**
 * Parse time string (HH:MM) to minutes from midnight
 */
export function parseTimeToMinutes(time: string): number | null {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

/**
 * Calculate total hours between start and end time
 * Handles overnight shifts (end < start)
 */
export function calculateTotalHours(start: string, end: string): number | null {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;

  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60; // Handle overnight shifts

  return Math.round((diff / 60) * 100) / 100;
}

/**
 * Format minutes from midnight to HH:MM string
 */
export function formatMinutesToTime(minutes: number): string {
  let adjustedMinutes = Math.round(minutes);
  // Handle overflow (> 24h) or underflow
  adjustedMinutes = adjustedMinutes % (24 * 60);
  if (adjustedMinutes < 0) adjustedMinutes += 24 * 60;
  
  const h = Math.floor(adjustedMinutes / 60);
  const m = adjustedMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Add hours to a time string
 */
export function addHoursToTime(time: string, hoursToAdd: number): string | null {
  const startMinutes = parseTimeToMinutes(time);
  if (startMinutes === null) return null;

  const totalMinutes = startMinutes + (hoursToAdd * 60);
  return formatMinutesToTime(totalMinutes);
}

/**
 * Check if a shift is an overnight shift (end time is before start time)
 */
export function isOvernightShift(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return false;
  return endMinutes < startMinutes;
}
