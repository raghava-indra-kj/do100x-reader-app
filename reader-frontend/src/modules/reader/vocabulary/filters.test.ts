import { describe, expect, it } from 'vitest';
import { localDay, savedDateRange } from './filters';

describe('vocabulary calendar filters', () => {
    const now = new Date(2026, 9, 4, 15, 0);
    it('sends local midnight boundaries as ISO instants', () => {
        expect(savedDateRange('today', '', '', now)).toEqual({
            savedFrom: new Date(2026, 9, 4).toISOString(), savedBefore: new Date(2026, 9, 5).toISOString(),
        });
        expect(savedDateRange('yesterday', '', '', now)).toEqual({
            savedFrom: new Date(2026, 9, 3).toISOString(), savedBefore: new Date(2026, 9, 4).toISOString(),
        });
    });
    it('starts the week on Monday and month on its first day', () => {
        expect(savedDateRange('week', '', '', now).savedFrom).toBe(new Date(2026, 8, 28).toISOString());
        expect(savedDateRange('month', '', '', now).savedFrom).toBe(new Date(2026, 9, 1).toISOString());
    });
    it('includes the whole last custom day and handles month/year boundaries', () => {
        expect(savedDateRange('custom', '2026-12-31', '2027-01-01')).toEqual({
            savedFrom: new Date(2026, 11, 31).toISOString(), savedBefore: new Date(2027, 0, 2).toISOString(),
        });
        expect(savedDateRange('all', '', '', now)).toEqual({});
        expect(localDay(now)).toBe('2026-10-04');
    });
    it('rejects impossible, missing and reversed custom dates', () => {
        expect(() => savedDateRange('custom', '2026-02-30', '2026-03-01')).toThrow();
        expect(() => savedDateRange('custom', '', '2026-03-01')).toThrow();
        expect(() => savedDateRange('custom', '2026-03-02', '2026-03-01')).toThrow();
    });
});
