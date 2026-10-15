// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { sanitizeDiagramSvg } from './sanitize-svg';

it('keeps SVG geometry and HTML labels while stripping executable diagram content', () => {
  const svg = sanitizeDiagramSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0L10 10"/><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">Label <strong>bold</strong><img src="x" onerror="alert(1)"/></div></foreignObject><a href="javascript:alert(1)">link</a></svg>');
  expect(svg).toContain('<path'); expect(svg).toContain('Label'); expect(svg).toContain('<strong>');
  expect(svg).not.toContain('<script'); expect(svg).not.toContain('onerror'); expect(svg).not.toContain('javascript:');
});
