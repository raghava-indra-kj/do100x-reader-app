import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@reader/md-view';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Button } from '@modules/core/ui/primitives/button';
import { toast } from '@modules/core/ui/primitives/toast';
import { 
    X, 
    Maximize2, 
    Minimize2, 
    Trash2, 
    RotateCcw, 
    Square, 
    KeyRound, 
    AlertTriangle, 
    ServerCrash, 
    Clock, 
    Settings, 
    Code2, 
    Copy, 
    Check, 
    ChevronDown, 
    ChevronRight,
    Ban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { settingsPageRoute } from '@boot/routes';
import type { ChatErrorDetails } from '@domain/chat/models/chat-types';
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
    cancel?(entryId: string): void;
    retry?(entryId: string): void;
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

function ErrorCard({ 
    errorDetails, 
    fallbackError, 
    onRetry 
}: { 
    errorDetails: ChatErrorDetails | null; 
    fallbackError: string; 
    onRetry: () => void;
}) {
    const navigate = useNavigate();
    const [showRawJson, setShowRawJson] = useState(false);
    const [copied, setCopied] = useState(false);

    const type = errorDetails?.errorType || 'UNKNOWN';
    const message = errorDetails?.message || fallbackError;
    const description = errorDetails?.description;
    const rawError = errorDetails?.rawError;

    let badgeIcon = <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />;
    let badgeColor = 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
    let isConfigIssue = false;

    if (type === 'INVALID_API_KEY') {
        badgeIcon = <KeyRound size={15} className="text-red-500 shrink-0 mt-0.5" />;
        badgeColor = 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400';
        isConfigIssue = true;
    } else if (type === 'MODEL_NOT_FOUND' || type === 'CONFIG_ERROR') {
        badgeIcon = <Settings size={15} className="text-amber-500 shrink-0 mt-0.5" />;
        badgeColor = 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
        isConfigIssue = true;
    } else if (type === 'RATE_LIMIT') {
        badgeIcon = <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" />;
        badgeColor = 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400';
    } else if (type === 'NETWORK_ERROR' || type === 'PROVIDER_ERROR') {
        badgeIcon = <ServerCrash size={15} className="text-red-500 shrink-0 mt-0.5" />;
        badgeColor = 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400';
    } else if (type === 'CANCELLED') {
        badgeIcon = <Ban size={15} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />;
        badgeColor = 'border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]';
    }

    const rawJsonStr = rawError 
        ? typeof rawError === 'string' 
            ? rawError 
            : JSON.stringify(rawError, null, 2)
        : null;

    const handleCopyJson = () => {
        if (!rawJsonStr) return;
        navigator.clipboard.writeText(rawJsonStr);
        setCopied(true);
        toast.success('Raw error copied');
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-xs space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
                {badgeIcon}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-[var(--color-text-strong)]">{message}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded-md border ${badgeColor}`}>
                            {type}
                        </span>
                    </div>
                    {description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)] flex-wrap">
                <Button size="sm" variant="secondary" onClick={onRetry} className="flex items-center gap-1.5 text-xs">
                    <RotateCcw size={13} />
                    <span>Retry Request</span>
                </Button>

                {isConfigIssue && (
                    <Button 
                        size="sm" 
                        variant="outlined" 
                        onClick={() => navigate(settingsPageRoute)}
                        className="flex items-center gap-1.5 text-xs"
                    >
                        <Settings size={13} />
                        <span>Open Settings</span>
                    </Button>
                )}

                {rawJsonStr && (
                    <button
                        onClick={() => setShowRawJson(!showRawJson)}
                        className="ml-auto flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer py-1"
                    >
                        <Code2 size={12} />
                        <span>{showRawJson ? 'Hide Raw Error' : 'View Raw Response'}</span>
                        {showRawJson ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                )}
            </div>

            {/* Expandable Raw Error Viewer */}
            {showRawJson && rawJsonStr && (
                <div className="rounded-lg bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)] p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[var(--color-text-subtle)] uppercase">Raw Error Payload</span>
                        <button
                            onClick={handleCopyJson}
                            className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-brand)] transition-colors cursor-pointer"
                        >
                            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>
                    <pre className="text-[11px] font-mono text-[var(--color-text-muted)] overflow-x-auto p-2 rounded bg-[var(--color-surface-soft)] leading-relaxed max-h-48 overflow-y-auto">
                        {rawJsonStr}
                    </pre>
                </div>
            )}
        </div>
    );
}

function RawResponseViewer({ rawResponse }: { rawResponse: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!rawResponse) return null;

    const rawJsonStr = JSON.stringify(rawResponse, null, 2);
    const usage = rawResponse.usage;
    const model = rawResponse.model;

    const handleCopy = () => {
        navigator.clipboard.writeText(rawJsonStr);
        setCopied(true);
        toast.success('Raw JSON copied to clipboard');
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface-soft)] overflow-hidden text-xs">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <Code2 size={13} className="text-[var(--color-brand)]" />
                    <span className="font-medium">Raw Model Response</span>
                    {model && (
                        <span className="font-mono text-[10px] text-[var(--color-text-subtle)]">({model})</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {usage && (
                        <span className="text-[10px] text-[var(--color-text-subtle)] font-mono tabular-nums">
                            {usage.total_tokens ?? usage.totalTokens ?? 0} tokens
                        </span>
                    )}
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>
            </button>

            {isOpen && (
                <div className="p-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-subtle)] font-mono">
                            {usage && (
                                <span>
                                    Prompt: {usage.prompt_tokens ?? 0} | Completion: {usage.completion_tokens ?? 0}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-brand)] transition-colors cursor-pointer"
                        >
                            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                    </div>
                    <pre className="text-[10px] font-mono text-[var(--color-text-muted)] overflow-x-auto p-2.5 rounded bg-[var(--color-surface-soft)] leading-relaxed max-h-56 overflow-y-auto">
                        {rawJsonStr}
                    </pre>
                </div>
            )}
        </div>
    );
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
                    {storeInstance.history.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--color-surface-card)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] font-bold">
                            {storeInstance.history.length}
                        </span>
                    )}
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
                            {entry.error && (
                                <span className="text-[10px] text-red-500 font-bold leading-none">!</span>
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
                        <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in duration-150">
                            <Loader size={26} />
                            <span className="text-xs text-[var(--color-text-subtle)] text-center px-4 max-w-sm">
                                {loadingLabel}
                            </span>
                            <Button
                                size="sm"
                                variant="outlined"
                                onClick={() => storeInstance.cancel?.(activeEntry.id)}
                                className="flex items-center gap-1.5 text-xs text-[var(--color-error)] border-[var(--color-error)]/40 hover:bg-[var(--color-error-soft)]/30 hover:border-[var(--color-error)] transition-colors"
                            >
                                <Square size={11} className="fill-current" />
                                <span>Cancel Request</span>
                            </Button>
                        </div>
                    ) : activeEntry.error ? (
                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider block mb-1">{queryLabel}:</span>
                                <p className="text-xs italic text-[var(--color-text-strong)] bg-[var(--color-surface-soft)] border-l-2 border-[var(--color-brand)] px-2.5 py-1.5 rounded leading-relaxed">
                                    "{getPillLabel(activeEntry)}"
                                </p>
                            </div>
                            <ErrorCard 
                                errorDetails={activeEntry.errorDetails} 
                                fallbackError={activeEntry.error} 
                                onRetry={() => storeInstance.retry?.(activeEntry.id)} 
                            />
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
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wider">AI Response:</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => storeInstance.retry?.(activeEntry.id)}
                                            className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] p-1 rounded transition-colors cursor-pointer"
                                            title="Regenerate response"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Regenerate</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(activeEntry.responseMarkdown);
                                                toast.success('Response copied');
                                            }}
                                            className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] p-1 rounded transition-colors cursor-pointer"
                                            title="Copy response markdown"
                                        >
                                            <Copy size={12} />
                                            <span>Copy</span>
                                        </button>
                                    </div>
                                </div>
                                <MarkdownRenderer
                                    markdown={activeEntry.responseMarkdown}
                                    colors={colors}
                                    fontSizes={uiSettings.fontSize.value}
                                    fonts={uiSettings.fontFamilies.value}
                                />
                            </div>

                            {/* Raw Model Response Inspector */}
                            <RawResponseViewer rawResponse={activeEntry.rawResponse} />

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
