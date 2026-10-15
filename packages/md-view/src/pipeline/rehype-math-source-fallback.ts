import type { Element, Root } from 'hast';

/**
 * A flow-math opening line is parsed as metadata. With no body, text such as
 * `$$ \\frac}` would otherwise become an invisible, successfully rendered formula.
 * Keep the original positioned source readable instead of silently dropping it.
 * Runs after sourceText so the fallback retains its trusted atomic math anchor.
 */
export function rehypeMathSourceFallback() {
    return (tree: Root, file: { value: unknown }) => {
        if (typeof file.value !== 'string') return;
        const source = file.value;
        function walk(parent: Root | Element) {
            for (const node of parent.children) {
                if (node.type !== 'element') continue;
                if (node.tagName === 'pre') {
                    const code = node.children.find(child => child.type === 'element' && child.tagName === 'code') as Element | undefined;
                    const classes = code?.properties.className?.toString() ?? '';
                    const start = node.position?.start.offset;
                    const end = node.position?.end.offset;
                    const fencedSource = start !== undefined && end !== undefined ? source.slice(start, end) : '';
                    if (code && /\bmath-display\b/.test(classes)
                        && code.children.every(child => child.type === 'text' && !child.value.trim())
                        && /^\s*\${2,}/.test(fencedSource)) {
                        // Text nodes are escaped by the renderer; author HTML remains data.
                        code.properties.className = ['language-text'];
                        code.children = [{ type: 'text', value: fencedSource }];
                        continue;
                    }
                }
                walk(node);
            }
        }
        walk(tree);
    };
}
