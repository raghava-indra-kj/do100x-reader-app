import { PageColorSchema } from '@modules/page/theme/page-color-schema';
import { PageFontFamilies } from '@modules/page/theme/page-font-families';
import { PageFontSizes } from '@modules/page/theme/page-font-sizes';
import { PageHeadingLevel } from '@modules/page/theme/page-heading-level';
import { action, computed, makeObservable, observable } from 'mobx';
import { createContext, useContext } from 'react';

const STORAGE_KEY = 'page_ui_settings';

export type SidebarPanelId = 'contents' | 'subpages';

interface StoredSettings {
    fontSizeId: string;
    colorSchemaId: string;
    fontFamiliesId: string;
    headingLevelId: string;
    sidebarPanelOpen: boolean;
    sidebarPanelId: string;
}

function findById<T extends { id: string }>(items: T[], id: string | undefined, fallback: T): T {
    if (!id) return fallback;
    return items.find(item => item.id === id) ?? fallback;
}

function loadStored(): Partial<StoredSettings> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export const PageUiSettingsContext = createContext<PageUiSettingsStore | null>(null);

export const usePageUiSettingsStore = () => {
    const store = useContext(PageUiSettingsContext);
    if (!store) throw new Error('usePageUiSettingsStore must be used within a PageUiSettingsProvider');
    return store;
};

export class PageUiSettingsStore {
    fontSize: PageFontSizes;
    colorSchema: PageColorSchema;
    fontFamilies: PageFontFamilies;
    headingLevel: PageHeadingLevel;
    sidebarPanelOpen: boolean;
    sidebarPanel: SidebarPanelId;

    constructor() {
        const stored = loadStored();
        this.fontSize = findById(PageFontSizes.VALUES, stored.fontSizeId, PageFontSizes.BASE);
        this.colorSchema = findById(PageColorSchema.VALUES, stored.colorSchemaId, PageColorSchema.LIGHT);
        this.fontFamilies = findById(PageFontFamilies.VALUES, stored.fontFamiliesId, PageFontFamilies.LEXEND);
        this.headingLevel = findById(PageHeadingLevel.VALUES, stored.headingLevelId, PageHeadingLevel.H3);
        this.sidebarPanelOpen = stored.sidebarPanelOpen ?? true;
        this.sidebarPanel = stored.sidebarPanelId === 'subpages' ? 'subpages' : 'contents';
        makeObservable(this, {
            fontSize: observable,
            colorSchema: observable,
            fontFamilies: observable,
            headingLevel: observable,
            sidebarPanelOpen: observable,
            sidebarPanel: observable,
            isFontSizeIncreasable: computed,
            isFontSizeDecreasable: computed,
            setFontSize: action,
            setColorSchema: action,
            setFontFamilies: action,
            setHeadingLevel: action,
            setSidebarPanelOpen: action,
            setSidebarPanel: action,
            increaseFontSize: action,
            decreaseFontSize: action,
        });
    }

    private persist() {
        const settings: StoredSettings = {
            fontSizeId: this.fontSize.id,
            colorSchemaId: this.colorSchema.id,
            fontFamiliesId: this.fontFamilies.id,
            headingLevelId: this.headingLevel.id,
            sidebarPanelOpen: this.sidebarPanelOpen,
            sidebarPanelId: this.sidebarPanel,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    setFontSize(fontSize: PageFontSizes) {
        this.fontSize = fontSize;
        this.persist();
    }

    setColorSchema(colorSchema: PageColorSchema) {
        this.colorSchema = colorSchema;
        this.persist();
    }

    setFontFamilies(fontFamilies: PageFontFamilies) {
        this.fontFamilies = fontFamilies;
        this.persist();
    }

    setHeadingLevel(headingLevel: PageHeadingLevel) {
        this.headingLevel = headingLevel;
        this.persist();
    }

    get isFontSizeIncreasable(): boolean {
        const index = PageFontSizes.VALUES.indexOf(this.fontSize);
        if (index === -1) return false;
        return index < PageFontSizes.VALUES.length - 1;
    }

    get isFontSizeDecreasable(): boolean {
        const index = PageFontSizes.VALUES.indexOf(this.fontSize);
        if (index === -1) return false;
        return index > 0;
    }

    setSidebarPanelOpen(open: boolean) {
        this.sidebarPanelOpen = open;
        this.persist();
    }

    setSidebarPanel(panel: SidebarPanelId) {
        this.sidebarPanel = panel;
        if (!this.sidebarPanelOpen) {
            this.sidebarPanelOpen = true;
        }
        this.persist();
    }

    increaseFontSize() {
        const index = PageFontSizes.VALUES.indexOf(this.fontSize);
        if (index === -1 || index >= PageFontSizes.VALUES.length - 1) return;
        this.setFontSize(PageFontSizes.VALUES[index + 1]);
    }

    decreaseFontSize() {
        const index = PageFontSizes.VALUES.indexOf(this.fontSize);
        if (index <= 0) return;
        this.setFontSize(PageFontSizes.VALUES[index - 1]);
    }
}
