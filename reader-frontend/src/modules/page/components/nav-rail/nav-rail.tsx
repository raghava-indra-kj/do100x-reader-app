import { usePageStore } from '../../store';
import type { SidebarPanelId } from '../../ui-settings-store';
import { ReaderToolIcon } from '@modules/reader/reader-tool-icon';
import { Observer } from 'mobx-react-lite';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';

const panels: { id: SidebarPanelId; label: string; shortcut: string }[] = [
    { id: 'contents', label: 'Contents', shortcut: 'Alt+C' },
    { id: 'subpages', label: 'Subpages', shortcut: 'Alt+S' },
    { id: 'quizzes', label: 'Quizzes', shortcut: 'Alt+Q' },
    { id: 'comments', label: 'Comments', shortcut: 'Alt+M' },
    { id: 'vocabulary', label: 'Saved words', shortcut: 'Alt+V' },
    { id: 'meaning', label: 'Word meanings', shortcut: 'Alt+A' },
    { id: 'explanation', label: 'Explanations', shortcut: 'Alt+E' },
    { id: 'doubt', label: 'Questions', shortcut: 'Alt+D' },
];

export function NavRail() {
    const store = usePageStore();

    return (
        <Observer>
            {() => {
                const uiSettings = store.uiSettingsStore;

                const getCount = (id: SidebarPanelId): number => {
                    switch (id) {
                        case 'contents':
                            return 0;
                        case 'subpages':
                            return store.optCurrentPage?.childrenCount ?? 0;
                        case 'comments':
                            return store.commentsCount;
                        case 'vocabulary':
                            return store.vocabCount;
                        case 'meaning':
                            return store.meaningStore.history.length;
                        case 'explanation':
                            return store.explanationStore.history.length;
                        case 'doubt':
                            return store.doubtStore.history.length;
                        default:
                            return 0;
                    }
                };

                return (
                    <nav aria-label="Reader panels" className="flex flex-col items-center gap-1 border-r border-[var(--color-border-default)] bg-[var(--color-surface-raised)] py-3 px-1.5 w-12 shrink-0">
                        {panels.map(({ id, label, shortcut }) => {
                            const isActive = uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === id;
                            const count = getCount(id);

                            return (
                                <Tooltip key={id} content={`${label} (${shortcut})${count > 0 ? ` • ${count}` : ''}`}>
                                    <button
                                        onClick={() => {
                                            if (isActive && uiSettings.sidebarPanelOpen) {
                                                uiSettings.setSidebarPanelOpen(false);
                                            } else {
                                                uiSettings.setSidebarPanel(id);
                                            }
                                        }}
                                        className={`
                                            relative flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] cursor-pointer
                                            transition-[background-color,color] duration-140 ease-out
                                            ${isActive
                                                ? 'bg-[var(--color-surface-card)] text-[var(--color-brand)]'
                                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-body)]'
                                            }
                                        `}
                                        aria-label={label}
                                        aria-keyshortcuts={shortcut}
                                        aria-pressed={isActive}
                                    >
                                        <ReaderToolIcon name={id} size={20} />
                                        {count > 0 && (
                                            <span
                                                className={`
                                                    absolute -top-1 -right-1 flex items-center justify-center
                                                    min-w-[15px] h-[15px] px-1 text-[9px] font-bold leading-none
                                                    rounded-full border border-[var(--color-surface-raised)] pointer-events-none
                                                    ${isActive
                                                        ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] shadow-xs'
                                                        : 'bg-[var(--color-surface-card-strong)] text-[var(--color-text-strong)]'
                                                    }
                                                `}
                                            >
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        )}
                                    </button>
                                </Tooltip>
                            );
                        })}
                    </nav>
                );
            }}
        </Observer>
    );
}
