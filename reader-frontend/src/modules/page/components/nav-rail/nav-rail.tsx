import { usePageStore } from '../../store';
import type { SidebarPanelId } from '../../ui-settings-store';
import { List, FileText } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';

const panels: { id: SidebarPanelId; label: string; shortcut: string; icon: typeof List }[] = [
    { id: 'contents', label: 'Contents', shortcut: 'Alt+C', icon: List },
    { id: 'subpages', label: 'Subpages', shortcut: 'Alt+S', icon: FileText },
];

export function NavRail() {
    const store = usePageStore();

    return (
        <Observer>
            {() => {
                const uiSettings = store.uiSettingsStore;
                return (
                    <nav className="flex flex-col items-center gap-1 border-r border-[var(--color-border-default)] bg-[var(--color-surface-raised)] py-3 px-1.5 w-12 shrink-0">
                        {panels.map(({ id, label, shortcut, icon: Icon }) => {
                            const isActive = uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === id;
                            return (
                                <Tooltip key={id} content={`${label} (${shortcut})`}>
                                    <button
                                        onClick={() => {
                                            if (isActive && uiSettings.sidebarPanelOpen) {
                                                uiSettings.setSidebarPanelOpen(false);
                                            } else {
                                                uiSettings.setSidebarPanel(id);
                                            }
                                        }}
                                        className={`
                                            flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] cursor-pointer
                                            transition-[background-color,color] duration-140 ease-out
                                            ${isActive
                                                ? 'bg-[var(--color-surface-card)] text-[var(--color-brand)]'
                                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-body)]'
                                            }
                                        `}
                                        aria-label={label}
                                    >
                                        <Icon size={18} />
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