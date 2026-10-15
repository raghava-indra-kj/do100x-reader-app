import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDocument } from '@reader/md-ast';
import { MarkdownRenderer } from './markdown-renderer';

const render = (markdown: string) => renderToStaticMarkup(<MarkdownRenderer markdown={markdown} />);

describe('standalone Markdown renderer', () => {
  it('renders prose, lists, tasks, tables and highlighted code without appearance props', () => {
    const html = render('# Title\n\nSome **strong** and *emphasized* words.\n\n- [x] Done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```javascript\nconst answer = 42;\n```');
    for (const token of ['<h1', '<strong', '<em', 'checkbox', '<table', 'hljs-keyword', 'Copy code', 'data-md-block-id']) expect(html).toContain(token);
  });

  it('preserves references outside a visible source range and supplies durable block IDs', () => {
    const markdown = '# Hidden\n\n[Documentation][docs]\n\n[docs]: https://example.com/docs\n';
    const document = createDocument(markdown, { generateId: (() => { let id = 0; return () => `block-${++id}`; })() });
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={markdown} document={document} sourceRange={{ start: 10, end: 32 }} />);
    expect(html).toContain('https://example.com/docs');
    expect(html).toContain('data-md-block-id="block-2"');
    expect(html).not.toContain('Hidden');
  });

  it('renders inline and display math with accessible output and retains invalid source', () => {
    const html = render('Inline $x^2$.\n\n$$\n\\frac{1}{2}\n$$\n\nInvalid $\\unknown{x}$.');
    expect(html).toContain('katex-mathml'); expect(html).toContain('katex-display');
    expect(html).toMatch(/class="katex-html" aria-hidden="true"/);
    expect(html).toContain('<msup>'); expect(html).toContain('<mfrac>');
    expect(html).toContain('\\unknown');
  });

  it('keeps a standalone inline formula attached to its source block', () => {
    const markdown = '$x^2$'; const document = createDocument(markdown);
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={markdown} document={document} />);
    expect(html).toContain(`data-md-block-id="${document.blocks[0].id}"`);
  });

  it.each([
    'For ordinary short-context requests:\n\n$$ \\text = \\frac}',
    'Before\n\n$$\n$$\n\nAfter',
    'Before\r\n\r\n$$ \\frac}\r\n   \r\n$$\r\n\r\nAfter',
  ])('retains empty math fences as readable source: %s', markdown => {
    const document = createDocument(markdown);
    const sourceBefore = JSON.stringify(document);
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={markdown} document={document} />);
    expect(html).toContain('language-text');
    expect(html).toContain('$$');
    expect(html).toContain('data-md-atomic-kind="math"');
    if (markdown.includes('\\frac}')) expect(html).toContain('\\frac}');
    if (markdown.endsWith('After')) expect(html).toContain('After');
    expect(html).not.toContain('katex');
    expect(JSON.stringify(document)).toBe(sourceBefore);
  });

  it('escapes markup in an empty math opening line without loosening sanitization', () => {
    const html = render('$$ <img src=x onerror=alert(1)> & <script>alert(2)</script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
  });

  it('supports host components and data-only embeds without app dependencies', () => {
    const markdown = '# Title\n\n```reader-component\n{"type":"quiz","id":"quiz-1"}\n```';
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={markdown}
      components={{ h1: ({ children }) => <h2 className="host-heading">{children}</h2>, div: 'section' }}
      embeds={{ quiz: ({ value }) => <aside>Quiz: {value.id}</aside> }} />);
    expect(html).toContain('host-heading'); expect(html).toContain('Quiz: quiz-1');
    expect(render('```reader-component\n{"type":"unknown","id":"1"}\n```')).toContain('unknown');
    expect(render('```reader-component\ninvalid json\n```')).toContain('invalid json');
  });

  it('blocks scripts, dangerous links, forged anchors and author CSS', () => {
    const html = render('<script>alert(1)</script>\n\n<a href="javascript:alert(1)">Bad</a>\n\n<div data-md-block-id="forged" style="position:fixed;inset:0" onclick="alert(1)">Safe text</div>');
    expect(html).not.toContain('<script'); expect(html).not.toContain('javascript:');
    expect(html).not.toContain('forged'); expect(html).not.toContain('position:fixed'); expect(html).not.toContain('onclick');
    expect(html).toContain('Safe text');
  });

  it('sanitizes URLs after resolving a base and constrains embedded frames', () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown='[file](secret)\n\n<iframe src="https://example.com" sandbox="allow-same-origin allow-scripts"></iframe>' baseUrl="file:///private/" />);
    expect(html).not.toContain('file:///'); expect(html).not.toContain('allow-same-origin');
    expect(html).toContain('sandbox="allow-scripts allow-presentation"');
  });
});
