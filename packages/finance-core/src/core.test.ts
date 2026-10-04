import { describe, expect, it } from 'vitest';
import { addMonths, currencyScale, dateInTimezone, formatMoney, MAX_MINOR, medianMoney, occurrenceDates, parseDate, parseMoney } from './index';

describe('exact financial arithmetic', () => {
  it('never loses cents or precision beyond JavaScript safe integers', () => {
    expect(parseMoney('0.10') + parseMoney('0.20')).toBe(30n);
    expect(formatMoney(parseMoney('90071992547409.93'))).toBe('90071992547409.93');
    expect(formatMoney(parseMoney('-0.01'))).toBe('-0.01');
    expect(parseMoney('123', 0)).toBe(123n);
    expect(formatMoney(parseMoney('1.234', 3), 3)).toBe('1.234');
  });
  it.each(['NaN', '1e5', '1,000.00', '1.234', '.5', ' 1', '--1', 'Infinity', formatMoney(MAX_MINOR + 1n)])('rejects invalid or overflowing money: %s', value => {
    expect(() => parseMoney(value)).toThrow();
  });
  it('derives currency precision and computes exact medians', () => {
    expect(currencyScale('INR')).toBe(2); expect(currencyScale('JPY')).toBe(0); expect(currencyScale('KWD')).toBe(3);
    expect(medianMoney([300n, 100n, 200n])).toBe(200n); expect(medianMoney([])).toBeNull();
  });
});

describe('calendar recurrence', () => {
  it.each(['2026-02-29', '2026-04-31', '04/10/2026', '2026-01-01T00:00:00Z'])('rejects invalid dates: %s', value => expect(() => parseDate(value)).toThrow());
  it('clamps month ends without drifting', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(occurrenceDates({ startDate: '2026-01-31', frequency: 'MONTHLY', interval: 1 }, '2026-01-01', '2026-03-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
  it('distinguishes four-week recharge from monthly billing and supports annual leap dates', () => {
    expect(occurrenceDates({ startDate: '2026-01-01', frequency: 'DAILY', interval: 28 }, '2026-01-01', '2026-03-31')).toEqual(['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26']);
    expect(occurrenceDates({ startDate: '2024-02-29', frequency: 'YEARLY', interval: 1 }, '2025-01-01', '2028-12-31')).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });
  it('supports month-end rules, finite schedules and single payments', () => {
    expect(occurrenceDates({ startDate: '2026-01-01', frequency: 'MONTHLY', interval: 1, monthEnd: true, endDate: '2026-02-28' }, '2026-01-01', '2026-04-01')).toEqual(['2026-01-31', '2026-02-28']);
    expect(occurrenceDates({ startDate: '2026-01-01', frequency: 'ONCE', interval: 1 }, '2026-01-02', '2026-03-31')).toEqual([]);
  });
  it('uses the book timezone rather than machine-local dates', () => {
    expect(dateInTimezone(new Date('2026-10-04T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-05');
    expect(dateInTimezone(new Date('2026-10-04T20:00:00Z'), 'UTC')).toBe('2026-10-04');
  });
});
