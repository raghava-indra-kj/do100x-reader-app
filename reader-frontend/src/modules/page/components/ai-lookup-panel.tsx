import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@reader/md-view';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Button } from '@modules/core/ui/primitives/button';
import { X, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import '@reader/md-view/md-view.css';
import '@reader/md-view/md-view-hljs.css';

export interface IAiLookupStore {
    history: any[];
    activeEntryId: string | null;
    activeEntry: any | null;
    isExpanded: boolean;
    clearHistory(): void;
    toggleExpand(): void;
    close(): void;
    setActiveEntry(id: string): void;
    removeEntry(id: string): void;
    reask(entryId: string, newText: string): void;
}

interface PageAiLookupPanelProps {
    title: string;
    icon: React.ReactNode;
    storeInstance: IAiLookupStore;
    queryLabel: string;
    rephraseLabel: string;
    rephrasePlaceholder: string;
    emptyStateLabel: string;
    loadingLabel: string;
    extraHeaderActions?: (activeEntry: any) => React.ReactNode;
}

export const PageAiLookupPanel = observer(function PageAiLookupPanel({
    title,
    icon,
    storeInstance,
    queryLabel,
    rephraseLabel,
    rephrasePlaceholder,
    emptyStateLabel,
    loadingLabel,
    extraHeaderActions,
}: PageAiLookupPanelProps) {
    const pageStore = usePageStore();
    const themeStore = useThemeStore();

    const uiSettings = pageStore.uiSettingsStore;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;

    const activeEntry = storeInstance.activeEntry;
    const [rephraseText, setRephraseText] = useState('');

    useEffect(() => {
        if (activeEntry) {
            setRephraseText(activeEntry.searchTerm ?? activeEntry.selectedText ?? '');
        } else {
            setRephraseText('');
        }
    }, [activeEntry?.id]);

    const getPillLabel = (entry: any) => {
        return entry.searchTerm ?? entry.selectedText ?? '';
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-3 pt-3 pb-2 border-b border-[var(--color-border-subtle)]">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider flex items-center gap-1.5 font-[family-name:var(--font-sans)]">
                    {icon}
                    <span>{title}</span>
                </span>
                <div className="flex items-center gap-2">
                    {activeEntry && extraHeaderActions && extraHeaderActions(activeEntry)}
                    
                    {storeInstance.history.length > 0 && (
                        <button
                            onClick={() => storeInstance.clearHistory()}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-error)] transition-colors cursor-pointer"
                            title="Clear lookup history"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                    <button
                        onClick={() => storeInstance.toggleExpand()}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                        title={storeInstance.isExpanded ? "Restore" : "Expand to full width"}
                    >
                        {storeInstance.isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button
                        onClick={() => storeInstance.close()}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* History pills scroll-rail at the top */}
            {storeInstance.history.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] shrink-0 scrollbar-none">
                    {storeInstance.history.map((entry) => (
                        <div
                            key={entry.id}
                            onClick={() => storeInstance.setActiveEntry(entry.id)}
                            className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 text-[10px] font-medium rounded-full cursor-pointer transition-colors border select-none ${
                                storeInstance.activeEntryId === entry.id
                                    ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] border-transparent'
                                    : 'bg-[var(--color-surface-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-body)] border-[var(--color-border-subtle)]'
                            }`}
                        >
                            <span className="truncate max-w-[80px]">{getPillLabel(entry)}</span>
                            {entry.isLoading && (
                                <span className="inline-block animate-pulse text-[8px]">⏳</span>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    storeInstance.removeEntry(entry.id);
                                }}
                                className="text-[var(--color-text-muted)] hover:text-white rounded-full p-0.5 -mr-1 cursor-pointer"
                                title="Remove item"
                            >
                                <X size={9} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Content view area */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeEntry ? (
                    activeEntry.isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <Loader size={24} />
                            <span className="text-xs text-[var(--color-text-subtle)]">{loadingLabel}</span>
                        </div>
                    ) : activeEntry.error ? (
                        <div className="rounded-lg bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] p-3 text-xs text-[var(--color-text-body)]">
                            <p className="font-semibold text-[var(--color-text-strong)]">Lookup Issue</p>
                            <p className="mt-1 leading-relaxed text-[var(--color-text-muted)]">{activeEntry.error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider block mb-1">{queryLabel}:</span>
                                <p className="text-xs italic text-[var(--color-text-strong)] bg-[var(--color-surface-soft)] border-l-2 border-[var(--color-brand)] px-2.5 py-1.5 rounded leading-relaxed">
                                    "{getPillLabel(activeEntry)}"
                                </p>
                            </div>
                            <div className="border-t border-[var(--color-border-subtle)] pt-4">
                                <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider block mb-2">AI Response:</span>
                                <MarkdownRenderer
                                    markdown={activeEntry.responseMarkdown}
                                    colors={colors}
                                    fontSizes={uiSettings.fontSize.value}
                                    fonts={uiSettings.fontFamilies.value}
                                />
                            </div>
                            <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-2 shrink-0">
                                <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider block">{rephraseLabel}:</span>
                                <div className="flex gap-2 items-stretch">
                                    <textarea
                                        value={rephraseText}
                                        onChange={(e) => setRephraseText(e.target.value)}
                                        placeholder={rephrasePlaceholder}
                                        className="flex-1 resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-14"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outlined"
                                        onClick={() => {
                                            if (!rephraseText.trim()) return;
                                            storeInstance.reask(activeEntry.id, rephraseText);
                                        }}
                                    >
                                        Re-ask
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="text-center text-xs text-[var(--color-text-subtle)] pt-12">
                        {emptyStateLabel}
                    </div>
                )}
            </div>
        </div>
    );
});
