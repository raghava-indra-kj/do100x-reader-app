// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@modules/core/theme';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { AppBarLayout } from './appbar-layout';

vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ isAuthenticated: true, currentUser: { label: 'Test user' } }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot>;
let narrow: boolean;
let media: EventTarget;
beforeEach(() => {
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    narrow = true;
    media = new EventTarget();
    vi.stubGlobal('matchMedia', (query: string) => ({
        get matches() { return narrow && query === '(max-width: 640px)'; },
        addEventListener: media.addEventListener.bind(media),
        removeEventListener: media.removeEventListener.bind(media),
    }));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    // jsdom does not perform layout. Base UI uses client rects to find focusable elements.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 100, 32)] as unknown as DOMRectList);
});
afterEach(async () => {
    await act(async () => root.unmount());
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function Example({ enabled = true, showApps = true }: { enabled?: boolean; showApps?: boolean }) {
    const [dialog, setDialog] = useState(false);
    return <MemoryRouter><ThemeProvider>
        <AppBarLayout showApps={showApps} actions={<button>Wide action</button>} compact={enabled ? {
            leading: <button>Menu</button>,
            actions: <button>Search</button>,
            menu: <><button>Adjust</button><button data-appbar-dismiss onClick={() => setDialog(true)}>Preferences</button></>,
        } : undefined} />
        <Dialog open={dialog} onOpenChange={setDialog} labelledBy="preferences-title">
            <h2 id="preferences-title">Preferences</h2><button>Apply</button>
        </Dialog>
    </ThemeProvider></MemoryRouter>;
}

const button = (label: string) => [...document.querySelectorAll('button')].find(b =>
    b.getAttribute('aria-label') === label || b.textContent === label);
const popup = () => document.querySelector('[role="dialog"][aria-label="More options"]');
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); }
async function click(label: string) {
    const target = button(label)!;
    await act(async () => { target.focus(); target.click(); });
    await settle();
}
async function escape() {
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await settle();
}

describe('opt-in compact app bar', () => {
    it('mounts one layout and tears down its open popup on resize', async () => {
        await act(async () => root.render(<Example />));
        expect(button('Search')).toBeDefined();
        expect(button('Wide action')).toBeUndefined();
        expect(button('Switch apps')).toBeUndefined();
        await click('More options');
        expect(popup()).not.toBeNull();
        expect(document.querySelectorAll('[aria-label="Switch apps"]')).toHaveLength(1);
        expect(document.querySelectorAll('[aria-label^="Account settings"]')).toHaveLength(1);
        await act(async () => { narrow = false; media.dispatchEvent(new Event('change')); });
        expect(popup()).toBeNull();
        expect(button('Wide action')).toBeDefined();
        expect(button('Search')).toBeUndefined();
        expect(document.querySelectorAll('[aria-label="Switch apps"]')).toHaveLength(1);
    });

    it('preserves visibility rules and the existing shell for apps without compact slots', async () => {
        await act(async () => root.render(<Example showApps={false} />));
        await click('More options');
        expect(button('Switch apps')).toBeUndefined();
        expect(document.querySelector('[role=combobox]')).not.toBeNull();
        await act(async () => root.render(<Example enabled={false} />));
        expect(button('Wide action')).toBeDefined();
        expect(button('More options')).toBeUndefined();
    });

    it('allows repeat actions and nested selectors, then dismisses a marked dialog launcher', async () => {
        await act(async () => root.render(<Example />));
        await click('More options');
        await click('Adjust');
        expect(popup()).not.toBeNull();
        await click('Theme: Light');
        expect(document.querySelector('[role=listbox]')).not.toBeNull();
        await escape();
        expect(button('Theme: Light')?.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(button('Theme: Light'));
        expect(button('More options')?.getAttribute('aria-expanded')).toBe('true');
        await click('Preferences');
        expect(popup()).toBeNull();
        const dialog = document.querySelector('[role=dialog]');
        expect(dialog?.contains(button('Apply')!)).toBe(true);
        expect(dialog?.contains(document.activeElement)).toBe(true);
    });
});
