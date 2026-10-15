import type { CaptureItem } from './api';

const minute = 60_000;
const hour = 60 * minute;
const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * hour);

export function captureSourceHref(source: string | null): string | null {
    if (!source) return null;
    try {
        const url = new URL(source);
        return /^https?:$/.test(url.protocol) && url.hostname ? url.href : null;
    } catch { return null; }
}

export function captureSourceLabel(source: string | null): string {
    if (!source) return 'Pasted content';
    const href = captureSourceHref(source);
    return href ? new URL(href).hostname.replace(/^www\./i, '') : 'Source unavailable';
}

export function captureExpiry(expiresAt: Date, now: number) {
    const remaining = expiresAt.getTime() - now;
    const exact = expiresAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    if (remaining <= 0) return { label: 'Expired', urgency: 'urgent', exact } as const;
    if (remaining < hour) {
        const minutes = Math.max(1, Math.ceil(remaining / minute));
        return { label: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`, urgency: 'urgent', exact } as const;
    }
    if (remaining < 6 * hour) {
        const hours = Math.max(1, Math.floor(remaining / hour));
        return { label: `${hours} ${hours === 1 ? 'hour' : 'hours'} left`, urgency: 'urgent', exact } as const;
    }
    const days = calendarDay(expiresAt) - calendarDay(new Date(now));
    if (days === 0) return { label: 'Today', urgency: 'soon', exact } as const;
    if (days === 1) return { label: 'Tomorrow', urgency: 'soon', exact } as const;
    return { label: `In ${days} days`, urgency: 'normal', exact } as const;
}

export function captureList(items: CaptureItem[], query: string, now: number) {
    const active = items.filter(item => item.captureExpiresAt.getTime() > now)
        .sort((a, b) => a.captureExpiresAt.getTime() - b.captureExpiresAt.getTime() || a.title.localeCompare(b.title));
    const search = query.trim().toLocaleLowerCase();
    const visible = active.filter(item => `${item.title} ${item.captureSourceUrl ?? ''}`.toLocaleLowerCase().includes(search));
    const empty = active.length ? 'search' : items.length ? 'expired' : 'empty';
    return { active, visible, empty };
}
