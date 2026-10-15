import type { Element, Root, RootContent } from 'hast';
import type { MarkdownDocument } from '@reader/md-ast';
import { mapRenderedText } from '../annotations/text-map';

/** rehype-raw can merge a list's positioned text with an unpositioned newline. */
export function sourceTextPositions() {
    return (tree: Root, file: { data: Record<string, unknown> }) => {
        const ends = new Map<number, NonNullable<RootContent['position']>['end']>();
        const starts = new Map<number, NonNullable<RootContent['position']>['start']>();
        function walk(node: Root | RootContent) {
            if (node.type === 'text' && node.position?.start?.offset !== undefined && node.position.end?.offset !== undefined) {
                ends.set(node.position.start.offset, { ...node.position.end });
                starts.set(node.position.end.offset, { ...node.position.start });
            }
            if ('children' in node) node.children.forEach(walk);
        }
        walk(tree);
        file.data.mdTextEnds = ends;
        file.data.mdTextStarts = starts;
    };
}

/** Repair before sanitization, which deliberately discards incomplete positions. */
export function repairTextPositions() {
    return (tree: Root, file: { data: Record<string, unknown> }) => {
        const ends = file.data.mdTextEnds as Map<number, NonNullable<RootContent['position']>['end']> | undefined;
        const starts = file.data.mdTextStarts as Map<number, NonNullable<RootContent['position']>['start']> | undefined;
        function walk(node: Root | RootContent) {
            if (node.type === 'text' && node.position?.start?.offset !== undefined && node.position.end?.offset === undefined) {
                const end = ends?.get(node.position.start.offset);
                if (end) node.position.end = { ...end };
            }
            if (node.type === 'text' && node.position?.end?.offset !== undefined && node.position.start?.offset === undefined) {
                const start = starts?.get(node.position.end.offset);
                if (start) node.position.start = { ...start };
            }
            if ('children' in node) node.children.forEach(walk);
        }
        walk(tree);
    };
}

/** Trusted markers are created only after author HTML has been sanitized. */
export function sourceText({ document }: { document: MarkdownDocument }) {
    return (tree: Root) => {
        function walk(parent: Root | Element) {
            parent.children = parent.children.map((node): RootContent => {
                const start = node.position?.start?.offset;
                const end = node.position?.end?.offset;
                if (node.type === 'text') {
                    // HTML parsing normalizes line endings on SSR; normalize React's
                    // client-created text too so both representations share offsets.
                    node.value = node.value.replace(/\r\n?/g, '\n');
                    if (start === undefined || end === undefined) return node;
                    const map = mapRenderedText(document.source, { start, end }, node.value, 'text', true);
                    return map ? { type: 'element', tagName: 'span', properties: { dataMdTextMap: JSON.stringify(map) }, children: [node] } : node;
                }
                if (node.type !== 'element') return node;
                const code = node.tagName === 'pre' ? node.children.find(child => child.type === 'element' && child.tagName === 'code') as Element | undefined : node.tagName === 'code' ? node : undefined;
                const classes = code?.properties.className?.toString() ?? '';
                const math = /(?:math-inline|math-display|language-math)/.test(classes);
                const generated = /language-(?:d2(?:lang)?|mermaid|reader-component)(?:\b|$)/.test(classes);
                const media = ['img', 'audio', 'video', 'iframe', 'hr'].includes(node.tagName);
                if ((math || generated || media) && start !== undefined && end !== undefined) {
                    return { type: 'element', tagName: node.tagName === 'pre' || ['video', 'audio', 'iframe', 'hr'].includes(node.tagName) ? 'div' : 'span', properties: {
                        dataMdAtomicStart: start, dataMdAtomicEnd: end, dataMdAtomicKind: math ? 'math' : generated ? 'component' : node.tagName,
                    }, children: [node] };
                }
                if (code && start !== undefined && end !== undefined) {
                    for (const child of code.children) if (child.type === 'text') child.value = child.value.replace(/\r\n?/g, '\n');
                    const text = code.children.map(child => child.type === 'text' ? child.value : '').join('');
                    const map = mapRenderedText(document.source, { start, end }, text, node.tagName === 'pre' ? 'block-code' : 'inline-code');
                    if (map) code.properties.dataMdTextMap = JSON.stringify(map);
                    return node; // Highlighting may replace children; the code element owns its map.
                }
                walk(node);
                return node;
            }) as typeof parent.children;
        }
        walk(tree);
    };
}
