import type { VocabularyQuery } from '@domain/vocabulary/models/db-vocabulary';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export function localDay(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function parseDay(day: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Choose a valid date range.');
    const [year, month, date] = day.split('-').map(Number);
    const result = new Date(year, month - 1, date);
    if (localDay(result) !== day) throw new Error('Choose a valid date range.');
    return result;
}
/** Calendar boundaries are calculated locally; never add 24 hours across DST. */
export function savedDateRange(preset: DatePreset, from: string, through: string, now = new Date()): Pick<VocabularyQuery, 'savedFrom' | 'savedBefore'> {
    if (preset === 'all') return {};
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start); end.setDate(end.getDate() + 1);
    if (preset === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
    if (preset === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    if (preset === 'month') start.setDate(1);
    if (preset === 'custom') {
        const a = parseDay(from), b = parseDay(through);
        if (a > b) throw new Error('The end date must follow the start date.');
        b.setDate(b.getDate() + 1);
        return { savedFrom: a.toISOString(), savedBefore: b.toISOString() };
    }
    return { savedFrom: start.toISOString(), savedBefore: end.toISOString() };
}
