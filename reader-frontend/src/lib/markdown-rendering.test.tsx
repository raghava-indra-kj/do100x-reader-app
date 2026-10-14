import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import katex from 'katex';
import { REMARK_PLUGINS } from '../../../packages/md-view/src/pipeline/remark-plugins';
import { getRehypePlugins } from '../../../packages/md-view/src/pipeline/rehype-plugins';

const render = (content: string) => renderToStaticMarkup(<Markdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={getRehypePlugins('#cc0000')}>{content}</Markdown>);

describe('shared markdown math rendering', () => {
  it('renders inline and display formulas through the complete sanitized pipeline', () => {
    const html = render('Inline $x^2 + y^2 = z^2$.\n\n$$\n\\frac{1}{2} + \\sqrt{4}\n$$');
    expect(html).toContain('katex-mathml'); expect(html).toContain('katex-display');
    expect(html).toContain('<msup>'); expect(html).toContain('<mfrac>'); expect(html).toContain('<msqrt>');
    expect(html).not.toContain('katex-error');
  });
  it('keeps invalid math readable and strips raw scripts and unsafe links', () => {
    const html = render('Before $\\unknowncommand{x}$ after.\n\n<script>alert(1)</script>\n\n$\\href{javascript:alert(1)}{click}$');
    expect(html).toContain('Before'); expect(html).toContain('after.'); expect(html).toContain('\\unknowncommand');
    expect(html).not.toContain('<script'); expect(html).not.toMatch(/href=["']javascript:/);
  });
  it('does not inherit trusted rendering from an options prototype', () => {
    const options = Object.create({ trust: true }); options.throwOnError = false;
    const html = katex.renderToString('\\href{javascript:alert(1)}{click}', options);
    expect(html).not.toMatch(/href=["']javascript:/);
  });
});
