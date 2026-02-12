/**
 * Validation and normalization utilities for roster scanner
 * Ensures dates are YYYY-MM-DD and times are HH:MM format
 */

export interface ValidationResult {
  isValid: boolean;
  normalizedValue: string | null;
  error?: string;
}

export interface AIExtractedShift {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  jobName?: string | null;
  rawDateText?: string;
  rawTimeText?: string;
  note?: string;
}

export interface ValidatedShift {
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  jobName: string | null;
  rawDateText: string;
  rawTimeText: string;
}

export interface ShiftValidationResult {
  validShifts: ValidatedShift[];
  errors: string[];
  warnings: string[];
}

// Month name to number mapping (supports multiple languages)
const MONTH_MAP: Record<string, string> = {
  // English
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
  // Korean
  '1월': '01', '2월': '02', '3월': '03', '4월': '04',
  '5월': '05', '6월': '06', '7월': '07', '8월': '08',
  '9월': '09', '10월': '10', '11월': '11', '12월': '12'
};

/**
 * Validate and normalize date string to YYYY-MM-DD format
 */
export function validateAndNormalizeDate(
  dateStr: string,
  currentYear: number
): ValidationResult {
  if (!dateStr || typeof dateStr !== 'string') {
    return { isValid: false, normalizedValue: null, error: 'Empty or invalid date input' };
  }

  const cleaned = dateStr.trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split('-').map(Number);
    if (isValidDate(year, month, day)) {
      return { isValid: true, normalizedValue: cleaned };
    }
    return { isValid: false, normalizedValue: null, error: `Invalid date values: ${cleaned}` };
  }

  // Try various parsing strategies
  const parsed = attemptDateParse(cleaned, currentYear);
  if (parsed) {
    return { isValid: true, normalizedValue: parsed };
  }

  return {
    isValid: false,
    normalizedValue: null,
    error: `Could not parse date: "${cleaned}"`
  };
}

/**
 * Validate and normalize time string to HH:MM format (24-hour)
 */
export function validateAndNormalizeTime(
  timeStr: string | null | undefined
): ValidationResult {
  if (!timeStr || typeof timeStr !== 'string') {
    return { isValid: false, normalizedValue: null };
  }

  const cleaned = timeStr.trim().toLowerCase();

  if (!cleaned) {
    return { isValid: false, normalizedValue: null };
  }

  // Already in HH:MM format (24-hour)
  if (/^\d{2}:\d{2}$/.test(cleaned)) {
    const [hours, minutes] = cleaned.split(':').map(Number);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { isValid: true, normalizedValue: cleaned };
    }
  }

  // Try parsing various time formats
  const parsed = attemptTimeParse(cleaned);
  if (parsed) {
    return { isValid: true, normalizedValue: parsed };
  }

  return {
    isValid: false,
    normalizedValue: null,
    error: `Could not parse time: "${timeStr}"`
  };
}

/**
 * Validate an array of AI-extracted shifts
 */
export function validateShifts(
  aiShifts: AIExtractedShift[],
  currentYear: number
): ShiftValidationResult {
  const validShifts: ValidatedShift[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(aiShifts)) {
    return { validShifts: [], errors: ['Invalid shifts array'], warnings: [] };
  }

  for (let i = 0; i < aiShifts.length; i++) {
    const shift = aiShifts[i];

    if (!shift || typeof shift !== 'object') {
      errors.push(`Shift ${i + 1}: Invalid shift object`);
      continue;
    }

    // Validate date (required)
    let normalizedDate: string | null = null;
    const dateResult = validateAndNormalizeDate(shift.date, currentYear);

    if (dateResult.isValid && dateResult.normalizedValue) {
      normalizedDate = dateResult.normalizedValue;
    } else if (shift.rawDateText) {
      // Try fallback with raw date text
      const fallbackResult = validateAndNormalizeDate(shift.rawDateText, currentYear);
      if (fallbackResult.isValid && fallbackResult.normalizedValue) {
        normalizedDate = fallbackResult.normalizedValue;
        warnings.push(`Shift ${i + 1}: Used rawDateText fallback for date`);
      }
    }

    if (!normalizedDate) {
      errors.push(`Shift ${i + 1}: ${dateResult.error || 'Invalid date'}`);
      continue;
    }

    // Validate times (optional)
    let normalizedStartTime: string | null = null;
    let normalizedEndTime: string | null = null;

    if (shift.startTime) {
      const startResult = validateAndNormalizeTime(shift.startTime);
      normalizedStartTime = startResult.normalizedValue;
      if (!startResult.isValid && shift.startTime) {
        warnings.push(`Shift ${i + 1}: Could not parse start time "${shift.startTime}"`);
      }
    }

    if (shift.endTime) {
      const endResult = validateAndNormalizeTime(shift.endTime);
      normalizedEndTime = endResult.normalizedValue;
      if (!endResult.isValid && shift.endTime) {
        warnings.push(`Shift ${i + 1}: Could not parse end time "${shift.endTime}"`);
      }
    }

    validShifts.push({
      date: normalizedDate,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      location: shift.location || null,
      jobName: shift.jobName || null,
      rawDateText: shift.rawDateText || shift.date,
      rawTimeText: shift.rawTimeText || `${shift.startTime || ''}-${shift.endTime || ''}`
    });
  }

  return { validShifts, errors, warnings };
}

// ============================================
// Internal parsing helpers
// ============================================

function attemptDateParse(dateStr: string, currentYear: number): string | null {
  const cleaned = dateStr.toLowerCase();

  // Pattern: "Thursday 15th January 2026" or "15th January 2026"
  const fullDateMatch = cleaned.match(
    /(?:\w+\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i
  );
  if (fullDateMatch) {
    const [, day, monthName, year] = fullDateMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Pattern: "15th January" or "January 15th" (no year)
  const noYearMatch1 = cleaned.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i
  );
  if (noYearMatch1) {
    const [, day, monthName] = noYearMatch1;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${currentYear}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Pattern: "January 15" or "Jan 15"
  const noYearMatch2 = cleaned.match(
    /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  );
  if (noYearMatch2) {
    const [, monthName, day] = noYearMatch2;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${currentYear}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Pattern: "15-Jan" or "15-January"
  const dashMonthMatch = cleaned.match(/^(\d{1,2})-(\w{3,})/i);
  if (dashMonthMatch) {
    const [, day, monthName] = dashMonthMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${currentYear}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Pattern: "Jan-15" or "January-15"
  const monthDashMatch = cleaned.match(/^(\w{3,})-(\d{1,2})/i);
  if (monthDashMatch) {
    const [, monthName, day] = monthDashMatch;
    const month = monthNameToNumber(monthName);
    if (month) {
      return `${currentYear}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Pattern: "15/1" or "15/01" (DD/MM format - common in AU/UK)
  const slashDDMM = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashDDMM) {
    const [, day, month] = slashDDMM;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    // Validate reasonable values
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Pattern: "15/1/2026" (DD/MM/YYYY)
  const slashFull = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashFull) {
    const [, day, month, year] = slashFull;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Pattern: "2026/1/15" (YYYY/MM/DD)
  const slashYMD = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashYMD) {
    const [, year, month, day] = slashYMD;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Korean date patterns: "1월 15일" or "2026년 1월 15일"
  const koreanMatch = cleaned.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일?/);
  if (koreanMatch) {
    const [, year, month, day] = koreanMatch;
    const y = year || currentYear.toString();
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

function attemptTimeParse(timeStr: string): string | null {
  const cleaned = timeStr.toLowerCase().replace(/\s+/g, '');

  // Pattern: "9am", "9:00am", "9:30pm", "12pm"
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (ampmMatch) {
    const [, hours, minutes = '00', period] = ampmMatch;
    let h = parseInt(hours, 10);

    if (period === 'pm' && h !== 12) h += 12;
    if (period === 'am' && h === 12) h = 0;

    if (h >= 0 && h <= 23) {
      return `${h.toString().padStart(2, '0')}:${minutes}`;
    }
  }

  // Pattern: "9:00 am" or "9:00 pm" (with space)
  const ampmSpaceMatch = timeStr.toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (ampmSpaceMatch) {
    const [, hours, minutes, period] = ampmSpaceMatch;
    let h = parseInt(hours, 10);

    if (period === 'pm' && h !== 12) h += 12;
    if (period === 'am' && h === 12) h = 0;

    if (h >= 0 && h <= 23) {
      return `${h.toString().padStart(2, '0')}:${minutes}`;
    }
  }

  // Pattern: "9:00" or "17:00" (24-hour without leading zero)
  const time24Match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    const [, hours, minutes] = time24Match;
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${minutes}`;
    }
  }

  // Pattern: "900" or "1700" (military time without colon)
  const militaryMatch = cleaned.match(/^(\d{3,4})$/);
  if (militaryMatch) {
    const [, time] = militaryMatch;
    const padded = time.padStart(4, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);

    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  // Special keywords
  if (/noon|12\s*pm|midday/.test(cleaned)) return '12:00';
  if (/midnight|12\s*am/.test(cleaned)) return '00:00';

  // Korean time patterns: "오전 9시" or "오후 5시 30분"
  const koreanMatch = timeStr.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (koreanMatch) {
    const [, period, hours, minutes = '0'] = koreanMatch;
    let h = parseInt(hours, 10);

    if (period === '오후' && h !== 12) h += 12;
    if (period === '오전' && h === 12) h = 0;

    if (h >= 0 && h <= 23) {
      return `${h.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
  }

  return null;
}

function monthNameToNumber(monthName: string): string | null {
  const lower = monthName.toLowerCase();
  return MONTH_MAP[lower] || null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Extract time range from a combined string like "9am-5pm" or "09:00-17:00"
 */
export function parseTimeRange(rangeStr: string): { start: string | null; end: string | null } {
  if (!rangeStr) return { start: null, end: null };

  // Pattern: "9am-5pm", "9:00am-5:00pm", "09:00-17:00"
  const rangeMatch = rangeStr.match(/^(.+?)\s*[-–—to]+\s*(.+)$/i);
  if (rangeMatch) {
    const [, startStr, endStr] = rangeMatch;
    const startResult = validateAndNormalizeTime(startStr.trim());
    const endResult = validateAndNormalizeTime(endStr.trim());

    return {
      start: startResult.normalizedValue,
      end: endResult.normalizedValue
    };
  }

  return { start: null, end: null };
}
