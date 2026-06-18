import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import type { Section } from '@domain/page/models/section';
import { List, Pencil, Copy } from 'lucide-react';
import { useState, useCallback } from 'react';
import { UpsertPageDialog } from './upsert-page';

function TocItem({
    section,
    baseLevel,
    isActive,
    onClick,
}: {
    section: Section;
    baseLevel: number;
    isActive: boolean;
    onClick: () => void;
}) {
    const depth = section.level - baseLevel;

    const handleCopy = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(section.fullMarkdown);
    }, [section]);

    return (
        <div
            className={`group flex items-start gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm transition-[background-color,color] duration-140 ease-out cursor-pointer ${
                isActive
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-body)]'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={onClick}
        >
            <span className="truncate leading-6 flex-1 min-w-0">
                {section.title ?? section.rawTitle ?? 'Untitled'}
            </span>
            <button
                onClick={handleCopy}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-all cursor-pointer"
                title="Copy section"
            >
                <Copy size={12} />
            </button>
        </div>
    );
}

export const PageToc = observer(function PageToc() {
    const store = usePageStore();
    const page = store.optCurrentPage;
    const [editOpen, setEditOpen] = useState(false);

    if (!page) {
        return null;
    }

    if (page.sections.length === 0) {
        const isEmpty = page.isEmpty;
        return (
            <div className="flex flex-col gap-3 h-full">
                <div className="flex items-center justify-between shrink-0 px-3 pt-3 pb-0">
                    <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">Contents</span>
                    <button
                        onClick={() => setEditOpen(true)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                        title="Edit page"
                    >
                        <Pencil size={14} />
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center">
                    <List size={24} className="text-[var(--color-text-subtle)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">{isEmpty ? 'This page is empty' : 'No headings in this page'}</p>
                </div>
                <UpsertPageDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    parentPageId={page.parentPageId}
                    editPageId={page.id}
                    initialTitle={page.title}
                    initialContent={page.content}
                    initialCategory={page.category}
                />
            </div>
        );
    }

    const maxLevel = store.uiSettingsStore.headingLevel.value ?? 6;
    const baseLevel = page.sections[0]?.level ?? 1;
    const activeSectionId = store.currentSection?.id;

    function renderSections(sections: Section[]): React.ReactNode[] {
        const items: React.ReactNode[] = [];
        for (const section of sections) {
            if (section.level > maxLevel) continue;
            items.push(
                <TocItem
                    key={section.id}
                    section={section}
                    baseLevel={baseLevel}
                    isActive={section.id === activeSectionId}
                    onClick={() => store.setCurrentSection(section)}
                />
            );
            items.push(...renderSections(section.children));
        }
        return items;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between shrink-0 px-3 pt-3 pb-0">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">Contents</span>
                <button
                    onClick={() => setEditOpen(true)}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                    title="Edit page"
                >
                    <Pencil size={14} />
                </button>
            </div>
            <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
                {renderSections(page.sections)}
            </nav>
            <UpsertPageDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                parentPageId={page.parentPageId}
                editPageId={page.id}
                initialTitle={page.title}
                initialContent={page.content}
                initialCategory={page.category}
            />
        </div>
    );
});