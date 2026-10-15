import { decodeString } from 'micromark-util-decode-string';
import type { SourceRange } from '@reader/md-ast';

/** Rendered UTF-16 interval followed by its original Markdown interval. */
export type TextMapRun = [number, number, number, number];
export interface TextSourceMap { text: string; runs: TextMapRun[] }
type Token = { text: string; start: number; end: number };

// Used only to reject stale rendered views, never as an authentication mechanism.
export function sourceFingerprint(source: string): string {
    let hash = 2166136261;
    for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
    return `${source.length}:${(hash >>> 0).toString(16)}`;
}

function tokens(source: string, start: number, decode: 'markdown' | 'html' | 'literal'): Token[] {
    const result: Token[] = [];
    const escapes = /^(?:\\[!-/:-@[-`{-~]|&(?:#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});)/i;
    for (let i = 0; i < source.length;) {
        const candidate = decode === 'literal' ? undefined : escapes.exec(source.slice(i))?.[0];
        const raw = candidate && (decode === 'markdown' || candidate[0] === '&') ? candidate : String.fromCodePoint(source.codePointAt(i)!);
        const text = decode === 'literal' ? raw : decodeString(raw);
        result.push({ text, start: start + i, end: start + i + raw.length });
        i += raw.length;
    }
    return result;
}

function compact(text: string, values: Token[]): TextSourceMap | undefined {
    if (values.map(value => value.text).join('') !== text) return;
    const runs: TextMapRun[] = [];
    let offset = 0;
    for (const token of values) {
        if (!token.text.length) continue;
        const next: TextMapRun = [offset, offset + token.text.length, token.start, token.end];
        const previous = runs.at(-1);
        // Coalesce only linear runs. Escapes and entities remain indivisible.
        if (previous && previous[3] === next[2] && previous[1] - previous[0] === previous[3] - previous[2] && next[1] - next[0] === next[3] - next[2]) {
            previous[1] = next[1]; previous[3] = next[3];
        } else runs.push(next);
        offset = next[1];
    }
    return { text, runs };
}

function lines(text: string, start: number) {
    return [...text.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)].filter(match => match[0].length).map(match => ({
        text: match[1], ending: match[2], start: start + match.index!, end: start + match.index! + match[0].length,
    }));
}

/** Only known line-prefix syntax may be omitted. Never fuzzy-match repeated words. */
function mapLines(raw: string, start: number, rendered: string, decode: 'markdown' | 'html' | 'literal', syntheticNewline = false) {
    const original = lines(raw, start), visible = lines(rendered, 0);
    if (original.length !== visible.length) return;
    const result: Token[] = [];
    for (let index = 0; index < original.length; index++) {
        const line = original[index], target = visible[index];
        const decoded = tokens(line.text, line.start, decode);
        const value = decoded.map(token => token.text).join('');
        let targetText = target.text;
        // Task-list rendering inserts a separator after the checkbox. It has no source.
        if (!value.endsWith(targetText) && syntheticNewline && index === 0 && targetText.trimStart() === value) {
            const padding = targetText.slice(0, targetText.length - value.length);
            result.push({ text: padding, start: line.start, end: line.start });
            targetText = value;
        }
        if (!value.endsWith(targetText)) return;
        const skip = value.length - targetText.length;
        if (skip && !/^[\t >]*$/.test(value.slice(0, skip))) return;
        let consumed = 0;
        for (const token of decoded) {
            if (consumed >= skip) result.push(token);
            else if (consumed + token.text.length > skip) return;
            consumed += token.text.length;
        }
        if (Boolean(line.ending) !== Boolean(target.ending) && !(syntheticNewline && index === original.length - 1 && !line.ending && target.ending === '\n')) return;
        if (target.ending) result.push({ text: target.ending, start: line.end - line.ending.length, end: line.end });
    }
    return compact(rendered, result);
}

/** Build a proven map; unsupported transformations return undefined rather than guessing. */
export function mapRenderedText(source: string, range: SourceRange, text: string, mode: 'text' | 'inline-code' | 'block-code' = 'text', syntheticNewline = false): TextSourceMap | undefined {
    let raw = source.slice(range.start, range.end), start = range.start;
    if (mode === 'inline-code') {
        const fence = /^`+/.exec(raw)?.[0];
        if (!fence || !raw.endsWith(fence)) return;
        raw = raw.slice(fence.length, -fence.length); start += fence.length;
        let values = [...raw.matchAll(/\r\n|\r|\n|[^\r\n]/gu)].map(match => ({ text: /^[\r\n]/.test(match[0]) ? ' ' : match[0], start: start + match.index!, end: start + match.index! + match[0].length }));
        const value = values.map(token => token.text).join('');
        if (value.startsWith(' ') && value.endsWith(' ') && /[^ ]/.test(value)) values = values.slice(1, -1);
        return compact(text, values);
    }
    if (mode === 'block-code') {
        const sourceLines = lines(raw, start);
        const fence = /^[ \t]*(`{3,}|~{3,})/.exec(sourceLines[0]?.text ?? '')?.[1];
        if (fence) {
            start = sourceLines[0].end;
            const last = sourceLines.at(-1)!;
            const closing = new RegExp(`^[\\t >]*${fence[0]}{${fence.length},}[ \\t]*$`).test(last.text) && sourceLines.length > 1;
            raw = source.slice(start, closing ? last.start : range.end);
        }
        return mapLines(raw, start, text, 'literal', true);
    }
    for (const decode of ['markdown', 'html', 'literal'] as const) {
        const mapped = mapLines(raw, start, text, decode, syntheticNewline);
        if (mapped) return mapped;
    }
}

export function mappedSourceRange(map: TextSourceMap, start: number, end: number): SourceRange[] {
    return map.runs.filter(run => run[0] < end && run[1] > start).map(([a, b, c, d]) => b - a === d - c
        ? { start: c + Math.max(0, start - a), end: d - Math.max(0, b - end) }
        : { start: c, end: d }).filter(range => range.end > range.start);
}
