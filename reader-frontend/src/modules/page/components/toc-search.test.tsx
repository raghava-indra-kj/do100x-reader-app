// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { PageToc } from './toc';

const page = { title: 'Guide', sections: ['First chapter', 'Unit 2 — Second chapter'].map(title => ({ id: title, title, level: 2, children: [] })) };
vi.mock('../store', () => ({ usePageStore: () => ({
    optCurrentPage: page, flatSections: page.sections, headingLevel: { value: 2, id: 'h2' },
}) }));
vi.mock('./upsert-page', () => ({ UpsertPageDialog: () => null }));

afterEach(() => vi.unstubAllGlobals());

it('filters complete heading titles and clears the search without hiding the depth selector', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    try {
        await act(async () => root.render(<PageToc />));
        const input = host.querySelector<HTMLInputElement>('input[aria-label="Find a section"]')!;
        expect(host.querySelector('[role="combobox"]')).toBeTruthy();
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'second');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(host.querySelector('nav')?.textContent).toBe('Unit 2 — Second chapter');
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
        expect(input.value).toBe('');
        expect(document.activeElement).toBe(input);
        expect(host.querySelector('nav')?.textContent).toContain('First chapter');
        expect(host.querySelector('[role="combobox"]')).toBeTruthy();
    } finally {
        await act(async () => root.unmount());
        host.remove();
    }
});
