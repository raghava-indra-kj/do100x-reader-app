import { describe, expect, it } from 'vitest';
import { buildAnnotationPrompt, parseAnnotationReply } from './page-annotation-ai';

const reply = (items: unknown[]) => JSON.stringify({ items });
const FENCE = '```';

describe('parseAnnotationReply', () => {
    it('reads plain JSON and trims items', () => {
        const items = parseAnnotationReply(reply([{ kind: 'summary', title: ' Gist ', content: ' Text ' }]), ['summary']);
        expect(items).toEqual([{ kind: 'summary', title: 'Gist', content: 'Text' }]);
    });

    it('reads JSON wrapped in a code fence or surrounding prose', () => {
        const json = reply([{ kind: 'key_takeaway', title: 'Idea', content: 'Body' }]);
        expect(parseAnnotationReply(`${FENCE}json\n${json}\n${FENCE}`, ['key_takeaway'])).toHaveLength(1);
        expect(parseAnnotationReply(`Here you go: ${json} Enjoy.`, ['key_takeaway'])).toHaveLength(1);
    });

    it('keeps a Mermaid fence inside a diagram item', () => {
        const content = `${FENCE}mermaid\nflowchart LR\n  A --> B\n${FENCE}`;
        const items = parseAnnotationReply(reply([{ kind: 'diagram', title: 'Flow', content }]), ['diagram']);
        expect(items?.[0].content).toBe(content);
    });

    it('drops kinds that were not requested and diagrams without a Mermaid block', () => {
        const items = parseAnnotationReply(reply([
            { kind: 'try_this', title: 'Not asked', content: 'x' },
            { kind: 'diagram', title: 'Plain', content: 'no diagram here' },
            { kind: 'summary', title: 'Kept', content: 'y' },
        ]), ['summary', 'diagram']);
        expect(items?.map((item) => item.title)).toEqual(['Kept']);
    });

    it('returns null for unusable replies', () => {
        expect(parseAnnotationReply('not json', ['summary'])).toBeNull();
        expect(parseAnnotationReply(reply([]), ['summary'])).toBeNull();
    });
});

describe('buildAnnotationPrompt', () => {
    it('names the section, lists only requested kinds and embeds the source', () => {
        const prompt = buildAnnotationPrompt({ pageTitle: 'Guide', sectionTitle: 'Joins', source: 'SOURCE TEXT', kinds: ['summary', 'diagram'] });
        expect(prompt).toContain('the section "Joins" of the page "Guide"');
        expect(prompt).toContain('"summary"');
        expect(prompt).toContain('"diagram"');
        expect(prompt).not.toContain('"try_this"');
        expect(prompt).toContain('SOURCE TEXT');
    });
});
