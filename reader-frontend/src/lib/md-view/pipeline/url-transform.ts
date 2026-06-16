import { defaultUrlTransform, type UrlTransform } from "react-markdown";

/** Protocols that are stripped from URLs for security. */
const DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript|file):/i;

/** Matches any absolute URL scheme (e.g. https:, file:, app:) or protocol-relative (//). */
const ABSOLUTE_URL = /^([a-zA-Z][a-zA-Z\d+\-.]*:|\/\/)/;

/** Strips dangerous protocols from a URL. */
export function sanitizeUrl(url: string | null | undefined): string | undefined {
    if (url == null) return undefined;
    const trimmed = String(url).trim();
    if (trimmed === "" || DANGEROUS_PROTOCOL.test(trimmed)) return undefined;
    return trimmed;
}

/**
 * Resolves a relative URL against a base URL.
 * Absolute URLs and fragment-only URLs are returned unchanged.
 * Falls back to the original URL if resolution fails (malformed base).
 *
 * Example: ("./image.png", "https://cdn.example.com/docs/") → "https://cdn.example.com/docs/image.png"
 * Example: ("https://example.com", "https://base.com/")     → "https://example.com" (unchanged)
 */
export function resolveRelativeUrl(url: string, baseUrl: string): string {
    if (!url || url.startsWith("#") || ABSOLUTE_URL.test(url)) return url;
    try {
        return new URL(url, baseUrl).href;
    } catch {
        return url;
    }
}

/** Hardened urlTransform for use with react-markdown. */
export const strictUrlTransform: UrlTransform = (url) => {
    return sanitizeUrl(defaultUrlTransform(url)) ?? "";
};

/**
 * Builds a urlTransform that applies strictUrlTransform then resolves relative URLs.
 * Used when baseUrl is provided to MarkdownRenderer.
 */
export function buildUrlTransform(baseUrl: string): UrlTransform {
    return (url) => {
        const safe = sanitizeUrl(defaultUrlTransform(url)) ?? "";
        return resolveRelativeUrl(safe, baseUrl);
    };
}
