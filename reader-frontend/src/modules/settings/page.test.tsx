// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ currentUser: { id: 'reader' } }) }));
vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => null }));
vi.mock('./store', () => ({ SettingsStore: class {} }));
vi.mock('./account-panel', () => ({ AccountPanel: () => <section>Account profile</section> }));
vi.mock('./ai-panel', () => ({ AiPanel: () => <section>Model assignments</section> }));
vi.mock('./reference-panels', () => ({
    McpPanel: () => <section>Server details</section>,
    GuidePanel: () => <section>Guide topics</section>,
}));
import SettingsPage from './page';

function Back() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Back</button>;
}

it('opens the linked section, preserves other parameters and follows browser history', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(
            <MemoryRouter initialEntries={['/settings?from=reader&section=ai']}>
                <Back /><SettingsPage />
            </MemoryRouter>
        ));
        const nav = host.querySelector('nav')!;
        expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('AI models');
        expect(host.querySelector('main')?.textContent).toContain('Model assignments');
        const guide = Array.from(nav.querySelectorAll('a')).find(a => a.textContent === 'Format guide')!;
        expect(guide.getAttribute('href')).toBe('/settings?from=reader&section=guide');
        await act(async () => guide.click());
        expect(host.querySelector('h1')?.textContent).toBe('Format guide');
        await act(async () => host.querySelector('button')!.click());
        expect(host.querySelector('h1')?.textContent).toBe('AI models');
        expect(nav.querySelector('a')?.getAttribute('href')).toBe('/settings?from=reader');
    } finally {
        await act(async () => root.unmount());
        vi.unstubAllGlobals();
    }
});
