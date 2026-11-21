// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { locateSections, type MarkdownSectionRange } from '@reader/md-ast';
import { Page, Section } from '@domain/page/models/page';
import { PageColorSchema } from '../theme/page-color-schema';
import { PageFontFamilies } from '../theme/page-font-families';
import { PageFontSizes } from '../theme/page-font-sizes';
import { SectionReader } from './section-reader';

const nested = '## Parent\n\nbody\n\n### Child\n\nchild body\n\n#### Grandchild\n\nmore\n\n## Next\n\nnext';
let root: Root;
beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    root = createRoot(document.body.appendChild(document.createElement('div')));
});
afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
    vi.unstubAllGlobals();
});

async function mount(source = nested, isOwner = true) {
    const ranges = locateSections(source);
    const range = ranges[0];
    const section = new Section({ id: 'section', pageId: 'page', title: range.title, rawTitle: range.title, level: range.level, content: source, children: [], sourceRange: range });
    const page = new Page({ id: 'page', parentPageId: null, title: 'Page', content: source, contentVersion: 0, category: null, createdAt: new Date(), updatedAt: new Date(), sections: [section], childrenCount: 0, isOwner });
    const onSelectRange = vi.fn<(range: MarkdownSectionRange) => void>();
    await act(async () => root.render(<SectionReader page={page} section={section} maxLevel={2} onSelectRange={onSelectRange}
        colors={PageColorSchema.LIGHT.value} fontSizes={PageFontSizes.BASE.value} fonts={PageFontFamilies.LEXEND.value} />));
    return { ranges, onSelectRange };
}

it('reads nested headings without an action row and reports the exact child range for editing', async () => {
    const { ranges, onSelectRange } = await mount();
    expect(document.querySelector('button, [aria-label="Section actions"]')).toBeNull();
    expect([...document.querySelectorAll('h2,h3,h4')].map(node => node.textContent)).toEqual(['Parent', 'Child', 'Grandchild']);
    await act(async () => document.querySelector<HTMLHeadingElement>('h4')!.click());
    expect(onSelectRange).toHaveBeenLastCalledWith(ranges[2]);
    const childBody = [...document.querySelectorAll('p')].find(node => node.textContent === 'child body')!;
    await act(async () => childBody.click());
    expect(onSelectRange).toHaveBeenLastCalledWith(ranges[1]);
});

it('reports the preamble range for a page without headings', async () => {
    const { ranges, onSelectRange } = await mount('Introduction without headings.');
    await act(async () => document.querySelector('p')!.click());
    expect(onSelectRange).toHaveBeenCalledWith(ranges[0]);
});

it('leaves read-only passages out of edit targeting', async () => {
    const { onSelectRange } = await mount(nested, false);
    await act(async () => document.querySelector<HTMLHeadingElement>('h3')!.click());
    expect(onSelectRange).not.toHaveBeenCalled();
});
