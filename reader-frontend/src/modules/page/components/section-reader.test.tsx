import { describe, expect, it, vi } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { locateSections } from '@reader/md-ast';
import type { MarkdownRendererProps } from '@reader/md-view';
import { Page } from '@domain/page/models/page';
import { Section } from '@domain/page/models/section';
import { PageColorSchema } from '../theme/page-color-schema';

// Keep the reading component's real heading overrides; diagrams are irrelevant
// to whether edit controls are duplicated across nested headings.
vi.mock('@reader/md-view', () => ({
    MarkdownRenderer: ({ markdown, components }: MarkdownRendererProps) => <div>
        {locateSections(markdown).filter((range) => range.kind === 'heading').map((range) => {
            const tag = `h${range.level}`;
            const Heading = components?.[tag as keyof typeof components] as ComponentType<any>;
            return createElement(Heading, {
                key: range.headingStart,
                node: { position: { start: { offset: range.headingStart } } },
            }, range.title);
        })}
    </div>,
}));
import { SectionReader } from './section-reader';

function renderReader({ source = '## Parent\n\nbody\n\n### Child\n\nchild\n\n#### Grandchild\n\nmore\n\n## Next\n\nnext', isOwner = true } = {}) {
    const range = locateSections(source)[0];
    const section = new Section({ id: 'section', pageId: 'page', title: range.title, rawTitle: range.title, level: range.level, content: source, children: [], sourceRange: range });
    const page = new Page({ id: 'page', parentPageId: null, title: 'Page', content: source, contentVersion: 0, category: null, createdAt: new Date(), updatedAt: new Date(), sections: [section], childrenCount: 0, isOwner });
    const sizes = { paragraph: 16, h1: 32, h2: 28, h3: 24, h4: 22, h5: 20, h6: 18, code: 14, equation: 16, blockquote: 16, callout: 16, listItem: 16, table: 16 };
    return renderToStaticMarkup(<SectionReader page={page} section={section} maxLevel={2} onEdit={() => {}} colors={PageColorSchema.LIGHT.value} fontSizes={sizes} fonts={{ heading: 'sans-serif', prose: 'sans-serif', code: 'monospace' }} />);
}

describe('single section-edit action', () => {
    it('renders one icon-only edit control, even with nested headings', () => {
        const html = renderReader();
        expect(html.match(/aria-label="Edit only:/g)).toHaveLength(1);
        expect(html.match(/<button/g)).toHaveLength(1);
        expect(html).not.toContain('Edit section</');
        expect(html).toContain('aria-label="Edit only: Parent"');
        expect(html).toMatch(/<h3[^>]*>Child<\/h3>/);
        expect(html).toMatch(/<h4[^>]*>Grandchild<\/h4>/);
        expect(html).not.toMatch(/<h[1-6][^>]*>[^<]*<button/);
    });
    it('renders no editing controls for a public visitor/nonowner', () => {
        const html = renderReader({ isOwner: false });
        expect(html).not.toContain('Edit only:');
        expect(html).not.toContain('<button');
    });
    it('keeps the same single entry point for a heading-free introduction', () => {
        const html = renderReader({ source: 'Introduction without headings.' });
        expect(html.match(/<button/g)).toHaveLength(1);
        expect(html).toContain('aria-label="Edit only: Introduction / page body"');
    });
});
