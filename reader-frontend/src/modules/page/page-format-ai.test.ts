import { describe, expect, it } from 'vitest';
import { buildPageFormatPrompt, buildSectionFormatPrompt, formatWarnings, headingLevelIssues, parseFormatReply } from './page-format-ai';

describe('parseFormatReply', () => {
    it('reads plain JSON, fenced JSON and JSON inside prose', () => {
        const json = JSON.stringify({ title: ' Guide ', category: 'Note', content: '# Guide\n\nBody\n' });
        const expected = { title: 'Guide', category: 'Note', content: '# Guide\n\nBody' };
        expect(parseFormatReply(json)).toEqual(expected);
        expect(parseFormatReply('```json\n' + json + '\n```')).toEqual(expected);
        expect(parseFormatReply('Here it is: ' + json + ' Done.')).toEqual(expected);
    });
    it('keeps a code fence that lives inside the content', () => {
        const content = '## A\n\n```sql\nSELECT 1;\n```';
        expect(parseFormatReply(JSON.stringify({ content }))?.content).toBe(content);
    });
    it('treats missing or blank fields as null and rejects unusable replies', () => {
        expect(parseFormatReply(JSON.stringify({ title: '  ' }))).toEqual({ title: null, category: null, content: null });
        expect(parseFormatReply('no json here')).toBeNull();
        expect(parseFormatReply('{"title": 5}')).toBeNull();
    });
});

describe('headingLevelIssues', () => {
    it('accepts a clean page and a first heading deeper than H1', () => {
        expect(headingLevelIssues('---\ntitle: "T"\n---\n\n# T\n\n## A\n\n### B\n\n## C\n')).toEqual([]);
        expect(headingLevelIssues('## Only sections\n\n### Sub\n')).toEqual([]);
    });
    it('flags a second H1 and a skipped level', () => {
        expect(headingLevelIssues('# A\n\n# B\n')).toContain('More than one top-level (H1) heading.');
        expect(headingLevelIssues('# A\n\n#### Deep\n')).toContain('A heading level is skipped.');
    });
    it('keeps section bodies below the section heading', () => {
        expect(headingLevelIssues('plain text only', { sectionLevel: 2 })).toEqual([]);
        expect(headingLevelIssues('### Sub\n\ntext\n\n#### Deeper\n', { sectionLevel: 2 })).toEqual([]);
        expect(headingLevelIssues('## Same level\n', { sectionLevel: 2 }).length).toBeGreaterThan(0);
        expect(headingLevelIssues('#### Too deep first\n', { sectionLevel: 2 })).toContain('The first sub-heading should be H3.');
    });
});

describe('formatWarnings', () => {
    it('warns when the result is much shorter than a long original', () => {
        const original = 'word '.repeat(100);
        expect(formatWarnings(original, 'short')[0]).toContain('much shorter');
        expect(formatWarnings(original, original)).toEqual([]);
        expect(formatWarnings('tiny', 'x')).toEqual([]);
    });
});

describe('prompts', () => {
    it('page prompt asks only for title and category when extracting', () => {
        const prompt = buildPageFormatPrompt({ mode: 'extract', title: '', category: null, content: 'RAW TEXT', categories: ['Recall'] });
        expect(prompt).toContain('{"title":"<title>","category":"<category>"}');
        expect(prompt).not.toContain('Format guide');
        expect(prompt).toContain('"Recall"');
        expect(prompt).toContain('RAW TEXT');
    });
    it('page prompt includes the guide, heading rules and the user\'s own title when formatting', () => {
        const prompt = buildPageFormatPrompt({ mode: 'both', title: 'My Title', category: 'Note', content: 'RAW', categories: [] });
        expect(prompt).toContain('Format guide');
        expect(prompt).toContain('Never skip a level');
        expect(prompt).toContain('My Title');
        expect(prompt).toContain('"content"');
    });
    it('section prompt fixes the heading level and forbids repeating the heading', () => {
        const prompt = buildSectionFormatPrompt({ pageTitle: 'Guide', sectionTitle: 'Joins', level: 2, body: 'BODY' });
        expect(prompt).toContain('heading level 2');
        expect(prompt).toContain('start at level 3');
        expect(prompt).toContain('Do not repeat the section heading');
        expect(prompt).toContain('BODY');
    });
});
