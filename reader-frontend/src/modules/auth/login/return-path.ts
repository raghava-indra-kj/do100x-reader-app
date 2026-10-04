import { homePageRoute } from '@boot/routes';

export function safeReturnPath(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return homePageRoute;
    try {
        const parsed = new URL(value, 'https://reader.invalid');
        const route = decodeURIComponent(parsed.pathname).replace(/\/+$/, '').toLowerCase();
        if (parsed.origin !== 'https://reader.invalid' || route === '/login') return homePageRoute;
        return parsed.pathname + parsed.search + parsed.hash;
    } catch { return homePageRoute; }
}
