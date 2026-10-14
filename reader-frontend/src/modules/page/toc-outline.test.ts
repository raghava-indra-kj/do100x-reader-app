import { describe, expect, it } from 'vitest';
import { Section } from '@domain/page/models/section';
import { buildOutline, compactOutline, filterOutline, outlineAncestors, outlineBranches } from './toc-outline';

const section = (id: string, level: number, children: Section[] = [], title = id) => new Section({ id, pageId: 'page', title, rawTitle: title, level, content: '', children });
const sections = [section('guide', 1, [section('design', 2, [section('contrast', 4)]), section('navigation', 2)])];
describe('contents outline', () => {
    it('avoids repeating the page title and retains the overview as a navigable section', () => {
        const nodes = compactOutline(buildOutline(sections, 6), 'guide');
        expect(nodes.map(node => node.label ?? node.section.title)).toEqual(['Overview', 'design', 'navigation']);
        expect(nodes[0].section.id).toBe('guide');
        expect(outlineBranches(nodes)).toEqual(['design']);
        expect(outlineAncestors(filterOutline(nodes, 'contrast'), 'contrast')).toEqual(['design', 'contrast']);
        expect(compactOutline(buildOutline(sections, 6), 'Different page title')).toHaveLength(1);
    });
    it('keeps ancestors of a search match and removes unrelated siblings', () => {
        const result = buildOutline(sections, 6, ' CONTRAST ');
        expect(outlineAncestors(result, 'contrast')).toEqual(['guide', 'design', 'contrast']);
        expect(result[0].children.map(node => node.section.id)).toEqual(['design']);
    });
    it('respects the reading depth and handles skipped heading levels', () => {
        expect(outlineAncestors(buildOutline(sections, 2), 'contrast')).toEqual([]);
        expect(outlineBranches(buildOutline(sections, 6))).toEqual(['guide', 'design']);
        expect(outlineBranches(buildOutline(sections, 2))).toEqual(['guide']);
    });
    it('leaves the source outline intact while filtering and returns no false matches', () => {
        expect(buildOutline(sections, 6, 'missing')).toEqual([]);
        expect(sections[0].children).toHaveLength(2);
        expect(buildOutline(sections, 2)[0].children).toHaveLength(2);
    });
});
