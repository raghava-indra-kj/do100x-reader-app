// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@modules/core/theme';
import { PageUiSettingsStore } from '../ui-settings-store';
import { PageSettingsDialog } from './settings';

let settings: PageUiSettingsStore;
vi.mock('../store', () => ({ usePageStore: () => ({ uiSettingsStore: settings }) }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ isAuthenticated: false }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

it('shows the saved width and keeps text size independent when choosing full width', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    settings = new PageUiSettingsStore();
    settings.setReadingWidth('wide');
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    try {
        await act(async () => root.render(<MemoryRouter><ThemeProvider>
            <PageSettingsDialog open onOpenChange={() => {}} />
        </ThemeProvider></MemoryRouter>));
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
        expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Reading settings');
        const radio = (value: string) => dialog.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)!;
        expect(radio('wide').checked).toBe(true);
        await act(async () => radio('full').click());
        expect(radio('full').checked).toBe(true);
        expect(radio('wide').checked).toBe(false);
        const reloaded = new PageUiSettingsStore();
        expect(reloaded.readingWidth).toBe('full');
        expect(reloaded.fontSize.id).toBe(settings.fontSize.id);
    } finally {
        await act(async () => root.unmount());
        host.remove();
    }
});
