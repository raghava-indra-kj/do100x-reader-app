import { describe, expect, it } from 'vitest';
import type { CaptureItem } from './api';
import { captureExpiry, captureList, captureSourceHref, captureSourceLabel } from './list-model';

const now = new Date(2026, 9, 15, 12).getTime();
const item = (id: string, days: number, title = id, source: string | null = null): CaptureItem => ({ id, title, captureExpiresAt: new Date(now + days * 86_400_000), createdAt: new Date(now), captureSourceUrl: source });

describe('temporary inbox presentation', () => {
    it('orders active captures by expiry without mutating the server response', () => {
        const items = [item('later', 5), item('expired', -1), item('soon', 1), item('now', 0)];
        expect(captureList(items, '', now).visible.map(item => item.id)).toEqual(['soon', 'later']);
        expect(items.map(item => item.id)).toEqual(['later', 'expired', 'soon', 'now']);
    });
    it('searches title and source and distinguishes empty, expired and no matching captures', () => {
        const items = [item('a', 1, 'Learn quicker', 'https://Example.com/article'), item('old', -1)];
        expect(captureList(items, '  EXAMPLE  ', now).visible.map(item => item.id)).toEqual(['a']);
        expect(captureList(items, 'learn', now).visible).toHaveLength(1);
        expect(captureList(items, 'missing', now)).toMatchObject({ empty: 'search', visible: [] });
        expect(captureList([item('old', -1)], 'anything', now).empty).toBe('expired');
        expect(captureList([], 'anything', now).empty).toBe('empty');
    });
    it('provides short urgent durations and exact local dates', () => {
        expect(captureExpiry(new Date(now + 2 * 3_600_000), now)).toMatchObject({ label: '2 hours left', urgency: 'urgent' });
        expect(captureExpiry(new Date(now + 20_000), now)).toMatchObject({ label: '1 minute left', urgency: 'urgent' });
        expect(captureExpiry(new Date(now), now).label).toBe('Expired');
        const tomorrow = new Date(2026, 9, 16, 12);
        expect(captureExpiry(tomorrow, now)).toEqual({ label: 'Tomorrow', urgency: 'soon', exact: tomorrow.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) });
        expect(captureExpiry(new Date(2026, 9, 15, 21), now).label).toBe('Today');
        expect(captureExpiry(new Date(2026, 9, 18, 12), now).label).toBe('In 3 days');
    });
    it('uses the local calendar for Tomorrow, even when more than 24 hours remain', () => {
        expect(captureExpiry(new Date(2026, 9, 16, 23), new Date(2026, 9, 15, 1).getTime()).label).toBe('Tomorrow');
        expect(captureExpiry(new Date(2026, 9, 16, 1), new Date(2026, 9, 15, 23).getTime()).label).toBe('2 hours left');
    });
    it.each(['not a URL', 'javascript:alert(1)', 'data:text/html,test', 'file:///secret', '//example.com'])('does not crash or link unsupported source %s', source => {
        expect(captureSourceLabel(source)).toBe('Source unavailable');
        expect(captureSourceHref(source)).toBeNull();
    });
    it('shows just the HTTP source hostname and a useful label for pasted text', () => {
        expect(captureSourceLabel('https://www.example.com/long?query=secret')).toBe('example.com');
        expect(captureSourceHref('https://example.com/path')).toBe('https://example.com/path');
        expect(captureSourceLabel(null)).toBe('Pasted content');
    });
});
