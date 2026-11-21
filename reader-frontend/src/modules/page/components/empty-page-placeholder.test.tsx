// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@modules/core/theme';
import type { Page } from '@domain/page/models/page';
import { PageUiSettingsStore } from '../ui-settings-store';
import { EmptyPagePlaceholder } from './empty-page-placeholder';

const fixture = vi.hoisted(() => ({ query: vi.fn(), owner: true }));
const page = { id: 'folder', title: 'Study notes', content: '', contentVersion: 3 } as Page;
let settings: PageUiSettingsStore;
vi.mock('@domain/page/services/pages-service', () => ({ queryPages: fixture.query }));
vi.mock('@modules/auth/provider', () => ({ useAuthStore: () => ({}) }));
vi.mock('../store', () => ({ usePageStore: () => ({
    isOwner: fixture.owner, optCurrentPage: page, uiSettingsStore: settings,
}) }));

let root: ReturnType<typeof createRoot>;
beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    settings = new PageUiSettingsStore();
    fixture.owner = true;
    fixture.query.mockResolvedValue({ ok: true, data: [] });
    root = createRoot(document.body.appendChild(document.createElement('div')));
});
afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
    vi.unstubAllGlobals();
});
const render = () => act(async () => root.render(<MemoryRouter><ThemeProvider><EmptyPagePlaceholder page={page} /></ThemeProvider></MemoryRouter>));
const button = (label: string) => [...document.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === label);
async function click(label: string) {
    const target = button(label);
    expect(target, label).toBeDefined();
    await act(async () => target!.click());
}

it('opens the existing page editor with the clipboard text as an unsaved draft', async () => {
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { clipboard: { readText: async () => 'A pasted note' } }));
    await render();
    expect(button('Write on this page')).toBeDefined();
    expect(button('New subpage')).toBeDefined();
    expect(button('Paste content')).toBeUndefined();
    await click('More page actions');
    await click('Paste content');
    expect(document.querySelector('textarea')?.value).toBe('A pasted note');
});

it('opens the Markdown importer from the overflow menu', async () => {
    await render();
    await click('More page actions');
    await click('Import Markdown');
    expect(document.querySelector('input[type="file"][multiple]')).toBeTruthy();
});

it('shows a single child without redundant list management controls', async () => {
    fixture.query.mockResolvedValue({ ok: true, data: [{ id: 'child', title: 'Chapter one', createdAt: new Date() }] });
    await render();
    expect(document.querySelector('a[href$="/child"]')?.textContent).toContain('Chapter one');
    expect(button('New subpage')).toBeDefined();
    expect(button('View options')).toBeUndefined();
    expect(button('Reorder Chapter one')).toBeUndefined();
});

it('shows a read-only empty state to a visitor', async () => {
    fixture.owner = false;
    await render();
    expect(document.body.textContent).toContain('This page is empty');
    expect(document.querySelector('button')).toBeNull();
});

it('offers sorting, grouping and drag handles when there are multiple children', async () => {
    fixture.query.mockResolvedValue({ ok: true, data: ['One', 'Two'].map((title, sortOrder) => ({
        id: title, title, sortOrder, createdAt: new Date(),
    })) });
    await render();
    expect(button('Reorder One')).toBeDefined();
    await click('View options');
    expect(document.querySelector('select[aria-label="Sort main page list"]')).toBeTruthy();
    expect(document.querySelector('select[aria-label="Group main page list"]')).toBeTruthy();
});

it('offers a retry when subpages fail to load and then shows the recovered list', async () => {
    fixture.query.mockResolvedValueOnce({ ok: false, error: new Error('Offline') })
        .mockResolvedValueOnce({ ok: true, data: [{ id: 'child', title: 'Chapter one', createdAt: new Date() }] });
    await render();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Couldn’t load the subpages');
    await click('Try again');
    expect(document.querySelector('a[href$="/child"]')?.textContent).toContain('Chapter one');
});
