import { PageHeadingLevel } from '@modules/page/theme/page-heading-level';
import { action, computed, makeObservable, observable } from 'mobx';

const STORAGE_KEY = 'page_reading_states';

interface StoredEntry {
    sectionId?: string | null;
    headingLevelId?: string | null;
}

type StoredMap = Record<string, StoredEntry>;

function loadAll(): StoredMap {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredMap) : {};
    } catch {
        return {};
    }
}

function saveAll(map: StoredMap) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // ignore quota / serialization errors
    }
}

function findById(id: string | null | undefined): PageHeadingLevel | null {
    if (!id) return null;
    return PageHeadingLevel.VALUES.find((h) => h.id === id) ?? null;
}

/**
 * Per-page reading state persisted to localStorage under the `page_reading_states` map
 * (keyed by pageId). Holds the last-viewed section id and an optional per-page heading
 * level override. The resolved heading level is produced by the owning store, which
 * supplies the global default (H2) when no per-page override is recorded.
 */
export class PageReadingState {
    readonly pageId: string;
    private _sectionId: string | null;
    private _headingLevelId: string | null;

    constructor({ pageId }: { pageId: string }) {
        this.pageId = pageId;
        const entry = loadAll()[pageId] ?? {};
        this._sectionId = entry.sectionId ?? null;
        this._headingLevelId = entry.headingLevelId ?? null;
        makeObservable<PageReadingState, '_sectionId' | '_headingLevelId'>(this, {
            _sectionId: observable.ref,
            _headingLevelId: observable.ref,
            sectionId: computed,
            headingLevelOverride: computed,
            setSectionId: action,
            setHeadingLevel: action,
        });
    }

    get sectionId(): string | null {
        return this._sectionId;
    }

    /** The per-page heading level override, or null when no override has been recorded. */
    get headingLevelOverride(): PageHeadingLevel | null {
        return findById(this._headingLevelId);
    }

    setSectionId(sectionId: string | null) {
        this._sectionId = sectionId;
        this.persist();
    }

    setHeadingLevel(level: PageHeadingLevel) {
        this._headingLevelId = level.id;
        this.persist();
    }

    private persist() {
        const map = loadAll();
        map[this.pageId] = {
            sectionId: this._sectionId,
            headingLevelId: this._headingLevelId,
        };
        saveAll(map);
    }
}