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
