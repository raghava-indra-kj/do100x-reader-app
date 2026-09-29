import { describe, expect, it } from 'vitest';
import { editableSectionBody, locateSections, replaceSectionBody, sectionBodyTarget } from './section-edit';

const edit = (source: string, index: number, newBody: string) => replaceSectionBody({ source, target: sectionBodyTarget(source, locateSections(source)[index]), newBody });

describe('source-scoped section editing', () => {
    it('keeps duplicate headings distinct and every outside character identical', () => {
        const source = '# Same\n\nfirst\n\n# Same\n\nsecond\n\n# End\n\nlast\n';
        const range = locateSections(source)[1];
        const updated = edit(source, 1, 'replacement');
        expect(updated.slice(0, range.bodyStart)).toBe(source.slice(0, range.bodyStart));
        expect(updated.endsWith(source.slice(range.bodyEnd))).toBe(true);
        expect(updated).toContain('first');
        expect(updated).not.toContain('second');
    });
    it('excludes nested children from a parent body', () => {
        const source = '## Parent\n\nbody\n\n### Child\n\nchild body\n\n## Other\n\nother';
        expect(edit(source, 0, 'new body')).toBe('## Parent\n\nnew body\n\n### Child\n\nchild body\n\n## Other\n\nother');
    });
    it('supports Setext headings and closing ATX markers without rewriting them', () => {
        const source = 'Title\n=====\n\nbody\n\n## Next ##\n\nnext';
        expect(edit(source, 0, 'changed')).toBe('Title\n=====\n\nchanged\n\n## Next ##\n\nnext');
    });
    it('ignores headings in code, blockquotes, math, and frontmatter', () => {
        const source = '---\ntitle: "# Metadata"\n---\n\n# Real\n\n```d2\n# comment\nx -> y\n```\n\n> ## quote\n\n$$\n# formula\n$$\n\n## Next\n\nbody';
        expect(locateSections(source).map((range) => range.title)).toEqual(['Real', 'Next']);
    });
    it('edits preamble or a heading-free page while preserving frontmatter', () => {
        const source = '---\ntitle: metadata\n---\n\nintro\n\n## Start\n\nbody';
        const updated = edit(source, 0, 'new intro');
        expect(updated).toBe('---\ntitle: metadata\n---\n\nnew intro\n\n## Start\n\nbody');
        expect(edit('body without headings', 0, 'changed')).toBe('changed');
    });
    it('does not offer frontmatter-only text as an editable body', () => {
        expect(locateSections('---\ntitle: only metadata\n---\n')).toEqual([]);
    });
    it('supports clearing an empty or nonempty body without eating the next heading', () => {
        expect(edit('## A\n\nbody\n\n## B\n\nbody b', 0, '')).toBe('## A\n\n## B\n\nbody b');
        expect(edit('## A\n## B', 0, 'new')).toBe('## A\n\nnew\n\n## B');
        expect(edit('', 0, 'new')).toBe('new');
    });
    it('preserves CRLF, Unicode offsets, and outside trailing spaces', () => {
        const source = '## 😀 title\r\n\r\nold\r\n\r\n## Next\r\n\r\nnext  \r\n';
        const range = locateSections(source)[0];
        const updated = edit(source, 0, '新しい\nline');
        expect(updated).toContain('新しい\r\nline');
        expect(updated.endsWith(source.slice(range.bodyEnd))).toBe(true);
    });
    it('returns the original source for a no-op, including unusual spacing', () => {
        const source = '## Title\n\n\nbody  \n\n\n## Next\n';
        expect(edit(source, 0, editableSectionBody(source, locateSections(source)[0]))).toBe(source);
    });
    it('rejects stale positions and exact-body mismatches without trimming', () => {
        const source = '## A\n\nbody\n\n## B\n';
        const target = sectionBodyTarget(source, locateSections(source)[0]);
        expect(() => replaceSectionBody({ source: source.replace('body', 'BODY'), target, newBody: 'changed' })).toThrow('Section changed');
        expect(() => replaceSectionBody({ source, target: { ...target, bodyStart: target.bodyStart + 1 }, newBody: 'changed' })).toThrow('Section changed');
    });
    it.each(['## New heading', 'New heading\n-----------', '```\nunclosed'])('rejects structural boundary escape: %s', (body) => {
        expect(() => edit('## A\n\nold\n\n## B\n\nkeep', 0, body)).toThrow('heading structure');
    });
    it('rejects unclosed HTML containers but allows complete details/callouts', () => {
        const source = '## A\n\nold\n\n## B\n\nkeep';
        expect(() => edit(source, 0, '<div>\n\nunclosed')).toThrow('Unclosed HTML');
        expect(edit(source, 0, '<details>\n<summary>Open</summary>\n\ntext\n\n</details>')).toContain('<details>');
        expect(edit(source, 0, '<callout>\n\ntext\n\n</callout>')).toContain('<callout>');
    });
    it('rejects replacing the actual next heading with a fake heading and swallowing the original', () => {
        expect(() => edit('## A\n\nold\n\n## B\n\nkeep', 0, '## B\n\n```')).toThrow('heading structure');
    });
    it('allows headings safely contained in a complete diagram/code fence', () => {
        expect(edit('## A\n\nold\n\n## B\n\nkeep', 0, '```d2\n# comment\na -> b\n```')).toContain('# comment');
    });
    it('rejects global reference-definition edits that could affect other sections', () => {
        expect(() => edit('## A\n\n[doc]: https://a.test\n\n## B\n\n[link][doc]', 0, '[doc]: https://b.test')).toThrow('definitions');
    });
    it('rejects adding frontmatter through the introduction editor', () => {
        expect(() => edit('intro\n\n## A\n\nbody', 0, '---\ntitle: changed\n---')).toThrow('Frontmatter');
    });
    it('preserves arbitrary prefixes and suffixes across many edits', () => {
        for (let index = 0; index < 80; index++) {
            const eol = index % 2 ? '\r\n' : '\n';
            const source = `# Duplicate${eol}${eol}prefix 😀 ${index}  ${eol}${eol}## Target${eol}${eol}old${eol}${eol}### Duplicate${eol}${eol}suffix 新 ${index}  ${eol}`;
            const range = locateSections(source)[1];
            const updated = edit(source, 1, `replacement ${'x'.repeat(index)}`);
            expect(updated.startsWith(source.slice(0, range.bodyStart))).toBe(true);
            expect(updated.endsWith(source.slice(range.bodyEnd))).toBe(true);
        }
    });
});
