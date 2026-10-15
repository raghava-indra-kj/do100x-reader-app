// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { createDocument, createBlocksAnchor, applySourceEdits, type MarkdownDocument, type AnnotationAnchor } from '@reader/md-ast';
import { MarkdownRenderer, type MarkdownRendererProps } from '../markdown-renderer';
import { selectionToAnchor, anchorToRanges } from './selection';

afterEach(() => { document.body.innerHTML = ''; });

function render(source: string, options: Partial<MarkdownRendererProps> = {}) {
    const model = createDocument(source);
    document.body.innerHTML = renderToStaticMarkup(<MarkdownRenderer markdown={source} document={model} {...options} />);
    return { model, root: document.querySelector<HTMLElement>('.md-view')! };
}
function textRange(element: Element, start: number, end: number) {
    const range = document.createRange(), walker = document.createTreeWalker(element, 4);
    let offset = 0, began = false;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = node.textContent!.length;
        if (!began && start < offset + length) { range.setStart(node, start - offset); began = true; }
        if (began && end <= offset + length) { range.setEnd(node, end - offset); return range; }
        offset += length;
    }
    throw new Error('Range outside test content');
}
function selected(root: HTMLElement, model: MarkdownDocument, range: Range) {
    const result = selectionToAnchor(root, model, range);
    expect(result.status, JSON.stringify(result) + '\n' + root.innerHTML).toBe('attached');
    if (result.status !== 'attached') throw new Error(JSON.stringify(result));
    return result.anchor;
}
function sourcePieces(model: MarkdownDocument, anchor: AnnotationAnchor) {
    return anchor.segments.map(segment => model.blocks.find(block => block.id === segment.blockId)!.source.slice(segment.start, segment.end));
}

describe('rendered selections and persistent anchors', () => {
    it('maps formatted words, escaped punctuation, entities and emoji to exact source', () => {
        const { root, model } = render('A **bold** &amp; \\*escaped\\* 😀 finish');
        const p = root.querySelector('p')!;
        const anchor = selected(root, model, textRange(p, 2, p.textContent!.length - 7));
        expect(anchor.quote).toBe('bold & *escaped* 😀');
        expect(sourcePieces(model, anchor)).toEqual(['bold', ' &amp; \\*escaped\\* 😀']);
        expect(anchorToRanges(root, model, anchor).map(range => range.toString()).join('')).toBe(anchor.quote);
    });

    it('distinguishes identical words and rejects a stale rendered view', () => {
        const { root, model } = render('repeat repeat repeat');
        const anchor = selected(root, model, textRange(root.querySelector('p')!, 7, 13));
        expect(anchor.segments[0]).toMatchObject({ start: 7, end: 13 });
        const changed = applySourceEdits(model, [{ start: 0, end: 0, expected: '', insert: 'New ' }]);
        expect(selectionToAnchor(root, changed, textRange(root.querySelector('p')!, 7, 13))).toMatchObject({ status: 'unmapped', reason: 'stale-view' });
        expect(anchorToRanges(root, changed, { ...anchor, segments: [] , status: 'source-removed' })).toEqual([]);
    });

    it('maps selections across paragraphs, table cells and nested list text', () => {
        const { root, model } = render('First paragraph\n\n| A | B |\n| - | - |\n| one | two |\n\n- list\n  - nested\n\nLast paragraph');
        const range = document.createRange();
        range.setStart(root.querySelector('p span')!.firstChild!, 6);
        const last = [...root.querySelectorAll('p')].at(-1)!;
        range.setEnd(last.querySelector('span')!.firstChild!, 4);
        const anchor = selected(root, model, range);
        expect(new Set(anchor.segments.map(segment => segment.blockId)).size).toBe(4);
        expect(sourcePieces(model, anchor)).toContain('nested');
        expect(sourcePieces(model, anchor)).toContain('two');
        expect(anchorToRanges(root, model, anchor).map(range => range.toString()).join(' ')).toContain('nested');
    });

    it('handles CRLF, blockquote prefixes and list continuation indentation', () => {
        const { root, model } = render('> one\r\n> two &amp; three\r\n\r\n- first\r\n  second');
        const p = root.querySelector('blockquote p')!;
        const start = p.textContent!.indexOf('two');
        const anchor = selected(root, model, textRange(p, start, p.textContent!.length));
        expect(sourcePieces(model, anchor).join('')).toBe('two &amp; three');
        const li = root.querySelector('li')!;
        const second = selected(root, model, textRange(li, li.textContent!.indexOf('second'), li.textContent!.length));
        expect(sourcePieces(model, second).join('')).toBe('second');
    });

    it('maps inline code without interpreting escapes or entities', () => {
        const { root, model } = render('Text `` a ` \\* &amp;\r\nb `` done');
        const code = root.querySelector('code')!;
        const start = code.textContent!.indexOf('&amp;');
        const anchor = selected(root, model, textRange(code, start, start + 5));
        expect(sourcePieces(model, anchor).join('')).toBe('&amp;');
        expect(anchorToRanges(root, model, anchor)[0].toString()).toBe('&amp;');
    });

    it('maps highlighted code across token elements without including language labels', () => {
        const { root, model } = render('```javascript\r\nconst answer = 42;\r\nconsole.log(answer);\r\n```');
        const code = root.querySelector('code')!;
        const anchor = selected(root, model, textRange(code, 6, 17));
        expect(anchor.quote).toBe('answer = 42');
        expect(sourcePieces(model, anchor).join('')).toBe('answer = 42');
        expect(anchorToRanges(root, model, anchor).map(range => range.toString()).join('')).toBe('answer = 42');
        const range = document.createRange(); range.selectNodeContents(root.querySelector('pre')!);
        const full = selected(root, model, range);
        expect(full.quote).not.toContain('javascript');
        expect(full.quote).not.toContain('Copy');
    });

    it('treats equations and images as atomic source targets', () => {
        const { root, model } = render('An equation $x^2 + y^2$ here.\n\n![Diagram](https://example.com/image.png)');
        const math = root.querySelector('[data-md-atomic-kind="math"]')!;
        const range = document.createRange(); range.selectNode(math);
        const anchor = selected(root, model, range);
        expect(sourcePieces(model, anchor)).toEqual(['$x^2 + y^2$']);
        expect(anchor.quote).toBe('$x^2 + y^2$');
        expect(anchorToRanges(root, model, anchor)[0].cloneContents().querySelector('.katex')).not.toBeNull();
        range.selectNode(root.querySelector('[data-md-atomic-kind="img"]')!);
        expect(sourcePieces(model, selected(root, model, range))).toEqual(['![Diagram](https://example.com/image.png)']);
    });

    it('keeps block selections usable when only a section is rendered', () => {
        const source = '# First\n\nOne\n\n# Second\n\nTwo';
        const { root, model } = render(source, { sourceRange: { start: source.indexOf('# Second'), end: source.length } });
        const anchor = createBlocksAnchor(model, [model.blocks[1].id, model.blocks[3].id]);
        expect(anchorToRanges(root, model, anchor).map(range => range.toString())).toEqual(['Two']);
    });

    it('maps task lists, raw HTML entities and indented code', () => {
        const { root, model } = render('- [x] Finished\n\n<div>HTML &copy; text</div>\n\n    const x = 1;\n    const y = 2;');
        const li = root.querySelector('li')!;
        const start = li.textContent!.indexOf('Finished');
        expect(sourcePieces(model, selected(root, model, textRange(li, start, start + 8)))).toEqual(['Finished']);
        const html = [...root.querySelectorAll('[data-md-text-map]')].find(node => node.textContent === 'HTML © text')!;
        expect(sourcePieces(model, selected(root, model, textRange(html, 5, 6)))).toEqual(['&copy;']);
        const code = root.querySelector('code')!;
        const y = code.textContent!.indexOf('y = 2');
        expect(sourcePieces(model, selected(root, model, textRange(code, y, y + 5)))).toEqual(['y = 2']);
    });

    it('maps generated embeds as objects and excludes their interactive controls', () => {
        const source = '```reader-component\n{"type":"quiz","id":"one"}\n```';
        const { root, model } = render(source, { embeds: { quiz: () => <aside><p>A quiz</p><button>Submit answer</button></aside> } });
        const range = document.createRange(); range.selectNode(root.querySelector('[data-md-atomic-kind="component"]')!);
        expect(sourcePieces(model, selected(root, model, range))).toEqual([source]);
        range.selectNodeContents(root.querySelector('button')!);
        expect(selectionToAnchor(root, model, range)).toEqual({ status: 'empty' });
    });

    it('maps display mathematics and complete code blocks without a trailing newline', () => {
        const source = '$$\n\\frac{1}{2}\n$$\n\n```js\nanswer';
        const { root, model } = render(source);
        const range = document.createRange(); range.selectNode(root.querySelector('[data-md-atomic-kind="math"]')!);
        expect(sourcePieces(model, selected(root, model, range))).toEqual(['$$\n\\frac{1}{2}\n$$']);
        range.selectNodeContents(root.querySelector('code')!);
        expect(sourcePieces(model, selected(root, model, range))).toEqual(['answer']);
    });

    it('keeps recovered empty math fences atomic and anchored to their complete unchanged source', () => {
        const source = 'For ordinary short-context requests:\n\n$$ \\text = \\frac}';
        const { root, model } = render(source);
        const math = root.querySelector('[data-md-atomic-kind="math"]')!;
        expect(math.querySelector('code')!.textContent).toBe('$$ \\text = \\frac}');
        const range = document.createRange();
        range.selectNode(math);
        const anchor = selected(root, model, range);
        expect(sourcePieces(model, anchor)).toEqual(['$$ \\text = \\frac}']);
        expect(anchor.quote).toBe('$$ \\text = \\frac}');
        expect(anchorToRanges(root, model, anchor)[0].cloneContents().querySelector('code')!.textContent).toBe('$$ \\text = \\frac}');
        expect(model.source).toBe(source);
    });

    it('does not accept changed custom-renderer text or forged source metadata', () => {
        const { root, model } = render('Original', { components: { p: () => <p>Replacement</p> } });
        expect(selectionToAnchor(root, model, textRange(root.querySelector('p')!, 0, 5))).toMatchObject({ status: 'unmapped', reason: 'custom-content', blockIds: [model.blocks[0].id] });
        const forged = render('<span data-md-text-map=\'{"text":"fake","runs":[[0,4,0,4]]}\' data-md-atomic-start="0" data-md-atomic-end="4">Real</span>');
        const range = textRange(forged.root.querySelector('[data-md-text-map]')!, 0, 4);
        expect(sourcePieces(forged.model, selected(forged.root, forged.model, range))).toEqual(['Real']);
    });

    it('rejects outside ranges, ignores toolbar text and preserves Unicode boundaries', () => {
        const { root, model } = render('😀 emoji', { renderBlockActions: () => <button>Comment block</button> });
        const ui = document.createRange(); ui.selectNodeContents(root.querySelector('button')!);
        expect(selectionToAnchor(root, model, ui)).toEqual({ status: 'empty' });
        const anchor = selected(root, model, textRange(root.querySelector('p')!, 1, 2));
        expect(sourcePieces(model, anchor)).toEqual(['😀']);
        const outside = document.createRange(); outside.selectNodeContents(document.body);
        expect(selectionToAnchor(root, model, outside)).toEqual({ status: 'outside' });
    });
});
