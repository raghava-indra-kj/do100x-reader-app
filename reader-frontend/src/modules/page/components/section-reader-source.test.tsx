import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { locateSections } from '@reader/md-ast';
import { Page } from '@domain/page/models/page';
import { Section } from '@domain/page/models/section';
import { SectionReader } from './section-reader';
import { PageColorSchema } from '../theme/page-color-schema';

it('renders a section with full-document references and absolute source coordinates', () => {
    const source = '# Before\n\nHidden body\n\n# Reading\n\nSee [the guide][guide].\n\n## Details\n\nSelected details.\n\n# After\n\nHidden ending\n\n[guide]: https://example.com/guide';
    const own = locateSections(source)[1];
    const section = new Section({ id: 'section', pageId: 'page', title: own.title, rawTitle: own.title, level: own.level, content: source, children: [], sourceRange: own });
    const page = new Page({ id: 'page', parentPageId: null, title: 'Page', content: source, contentVersion: 1, category: null, createdAt: new Date(), updatedAt: new Date(), sections: [section], childrenCount: 0, isOwner: true });
    const sizes = { paragraph: 16, h1: 32, h2: 28, h3: 24, h4: 22, h5: 20, h6: 18, code: 14, equation: 16, blockquote: 16, callout: 16, listItem: 16, table: 16 };
    const html = renderToStaticMarkup(<SectionReader page={page} section={section} maxLevel={1} onEdit={() => {}} colors={PageColorSchema.LIGHT.value} fontSizes={sizes} fonts={{ heading: 'sans-serif', prose: 'sans-serif', code: 'monospace' }} />);
    expect(html).toContain('href="https://example.com/guide"');
    expect(html).not.toContain('Hidden body'); expect(html).not.toContain('Hidden ending');
    expect(html).toContain(`data-reader-heading-start="${source.indexOf('# Reading')}"`);
    expect(html).toContain(`data-reader-heading-start="${source.indexOf('## Details')}"`);
    expect(html).toContain(`data-md-source-start="${source.indexOf('See [the guide]')}"`);
});
