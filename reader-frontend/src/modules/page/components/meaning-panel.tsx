import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@reader/md-view';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Button } from '@modules/core/ui/primitives/button';
import { Sparkles, X, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import '@reader/md-view/md-view.css';
import '@reader/md-view/md-view-hljs.css';

export const PageMeaningPanel = observer(function PageMeaningPanel() {
    const store = usePageStore();
    const meaningStore = store.meaningStore;
    const themeStore = useThemeStore();

    const uiSettings = store.uiSettingsStore;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;

    const activeEntry = meaningStore.activeEntry;
    const [rephraseText, setRephraseText] = useState('');

    useEffect(() => {
        if (activeEntry) {
            setRephraseText(activeEntry.searchTerm);
        } else {
            setRephraseText('');
        }
    }, [activeEntry?.id]);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-3 pt-3 pb-2 border-b border-[var(--color-border-subtle)]">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[var(--color-brand)]" />
                    <span>AI Meaning</span>
                </span>
                <div className="flex items-center gap-2">
                    {meaningStore.history.length > 0 && (
                        <button
                            onClick={() => meaningStore.clearHistory()}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-error)] transition-colors cursor-pointer"
                            title="Clear lookup history"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                    <button
                        onClick={() => meaningStore.toggleExpand()}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                        title={meaningStore.isExpanded ? "Restore" : "Expand to full width"}
                    >
                        {meaningStore.isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button
                        onClick={() => meaningStore.close()}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* History pills scroll-rail at the top */}
            {meaningStore.history.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] shrink-0 scrollbar-none">
                    {meaningStore.history.map((entry) => (
                        <div
                            key={entry.id}
                            onClick={() => meaningStore.setActiveEntry(entry.id)}
                            className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 text-[10px] font-medium rounded-full cursor-pointer transition-colors border select-none ${
                                meaningStore.activeEntryId === entry.id
                                    ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] border-transparent'
                                    : 'bg-[var(--color-surface-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-body)] border-[var(--color-border-subtle)]'
                            }`}
                        >
                            <span className="truncate max-w-[80px]">{entry.searchTerm}</span>
                            {entry.isLoading && (
                                <span className="inline-block animate-pulse text-[8px]">⏳</span>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    meaningStore.removeEntry(entry.id);
                                }}
                                className="text-[var(--color-text-muted)] hover:text-white rounded-full p-0.5 -mr-1 cursor-pointer"
                                title="Remove word"
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
                            <span className="text-xs text-[var(--color-text-subtle)]">Consulting AI for "{activeEntry.searchTerm}"...</span>
                        </div>
                    ) : activeEntry.error ? (
                        <div className="rounded-lg bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] p-3 text-xs text-[var(--color-text-body)]">
                            <p className="font-semibold text-[var(--color-text-strong)]">Lookup Issue</p>
                            <p className="mt-1 leading-relaxed text-[var(--color-text-muted)]">{activeEntry.error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider">
                                Term: "{activeEntry.searchTerm}"
                            </div>
                            <MarkdownRenderer
                                markdown={activeEntry.responseMarkdown}
                                colors={colors}
                                fontSizes={uiSettings.fontSize.value}
                                fonts={uiSettings.fontFamilies.value}
                            />
                            <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-2 shrink-0">
                                <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider block">Rephrase Term / Context:</span>
                                <div className="flex gap-2 items-stretch">
                                    <textarea
                                        value={rephraseText}
                                        onChange={(e) => setRephraseText(e.target.value)}
                                        placeholder="Modify term or add instructions..."
                                        className="flex-1 resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-14"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outlined"
                                        onClick={() => {
                                            if (!rephraseText.trim()) return;
                                            meaningStore.reaskMeaning(activeEntry.id, rephraseText);
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
                        Select text on the page and click "AI Meaning" to look up details.
                    </div>
                )}
            </div>
        </div>
    );
});
