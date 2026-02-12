import { describe, expect, it } from 'vitest';
import {
  validateAndNormalizeDate,
  validateAndNormalizeTime,
  validateShifts,
} from './validators';

describe('validateAndNormalizeDate', () => {
  it('normalizes full English date strings', () => {
    const result = validateAndNormalizeDate('Thursday 15th January 2026', 2026);
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('2026-01-15');
  });

  it('normalizes DD/MM dates using current year', () => {
    const result = validateAndNormalizeDate('15/01', 2026);
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('2026-01-15');
  });

  it('rejects impossible dates', () => {
    const result = validateAndNormalizeDate('2026-02-30', 2026);
    expect(result.isValid).toBe(false);
    expect(result.normalizedValue).toBeNull();
  });
});

describe('validateAndNormalizeTime', () => {
  it('normalizes 12-hour time to 24-hour format', () => {
    const morning = validateAndNormalizeTime('9am');
    const evening = validateAndNormalizeTime('5:30pm');

    expect(morning.isValid).toBe(true);
    expect(morning.normalizedValue).toBe('09:00');
    expect(evening.isValid).toBe(true);
    expect(evening.normalizedValue).toBe('17:30');
  });

  it('returns invalid for non-time text', () => {
    const result = validateAndNormalizeTime('not-a-time');
    expect(result.isValid).toBe(false);
    expect(result.normalizedValue).toBeNull();
  });
});

describe('validateShifts', () => {
  it('keeps valid shifts and reports invalid rows', () => {
    const result = validateShifts(
      [
        { date: '2026-01-15', startTime: '9am', endTime: '5pm', location: 'Main', jobName: 'AM' },
        { date: '2026-02-31', startTime: 'bad', endTime: '11:00' },
      ],
      2026,
    );

    expect(result.validShifts).toHaveLength(1);
    expect(result.validShifts[0].date).toBe('2026-01-15');
    expect(result.validShifts[0].startTime).toBe('09:00');
    expect(result.validShifts[0].endTime).toBe('17:00');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

