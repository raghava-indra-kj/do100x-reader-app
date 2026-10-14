import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageUiSettingsStore } from './ui-settings-store';

afterEach(() => vi.unstubAllGlobals());
describe('reading preferences', () => {
    it('preserves existing typography when adding a reading width preference', () => {
        const setItem = vi.fn();
        vi.stubGlobal('window', {});
        vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ fontSizeId: '4xl', sidebarPanelOpen: true, readingWidth: 'wide' }), setItem });
        const store = new PageUiSettingsStore();
        const fontSize = store.fontSize.id;
        store.setReadingWidth('full');
        const saved = JSON.parse(setItem.mock.calls.at(-1)![1]);
        expect(saved).toMatchObject({ readingWidth: 'full', fontSizeId: fontSize, sidebarPanelOpen: true });
    });
    it('does not overwrite the sidebar preference when entering focus mode', () => {
        vi.stubGlobal('localStorage', { setItem: vi.fn() });
        const store = new PageUiSettingsStore();
        store.setFocusMode(true);
        expect(store.focusMode).toBe(true);
        expect(store.sidebarPanelOpen).toBe(true);
        store.setSidebarPanel('comments');
        expect(store.focusMode).toBe(false);
        expect(store.sidebarPanel).toBe('comments');
    });
});
