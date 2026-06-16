import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import type { Section } from '@domain/page/models/section';

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
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                flex w-full items-start gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm
                transition-[background-color,color] duration-140 ease-out cursor-pointer
                ${isActive
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-body)]'
                }
            `}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
            <span className="truncate leading-6">
                {section.title ?? section.rawTitle ?? 'Untitled'}
            </span>
        </button>
    );
}

export const PageToc = observer(function PageToc() {
    const store = usePageStore();
    const page = store.optCurrentPage;

    if (!page || page.sections.length === 0) {
        return (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">
                No headings in this page.
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
        <nav className="flex flex-col gap-0.5 p-3">
            {renderSections(page.sections)}
        </nav>
    );
});