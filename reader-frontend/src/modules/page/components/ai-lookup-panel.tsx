import { SidebarHeader, SidebarEmpty } from './sidebar-ui';
import { Select } from '@modules/core/ui/primitives/select';
import { ReaderActionButton } from './reader-action-button';
import { observer } from 'mobx-react-lite';
import { useState, useEffect, useId } from 'react';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@reader/md-view';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Button } from '@modules/core/ui/primitives/button';
import { toast } from '@modules/core/ui/primitives/toast';
import { 
    X, Plus,
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
    storeInstance: IAiLookupStore;
    queryLabel: string;
    rephraseLabel: string;
    rephrasePlaceholder: string;
    emptyStateLabel: string;
    loadingLabel: string;
    onStart: (text: string) => void;
    startLabel: string;
    startPlaceholder: string;
    useSection?: boolean;
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
        toast.success('Error details copied');
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
                    <span>Try again</span>
                </Button>

                {isConfigIssue && (
                    <Button 
                        size="sm" 
                        variant="outlined" 
                        onClick={() => navigate(settingsPageRoute)}
                        className="flex items-center gap-1.5 text-xs"
                    >
                        <Settings size={13} />
                        <span>Open settings</span>
                    </Button>
                )}

                {rawJsonStr && (
                    <button
                        onClick={() => setShowRawJson(!showRawJson)}
                        className="ml-auto flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer py-1"
                    >
                        <Code2 size={12} />
                        <span>{showRawJson ? 'Hide error details' : 'View error details'}</span>
                        {showRawJson ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                )}
            </div>

            {/* Expandable Raw Error Viewer */}
            {showRawJson && rawJsonStr && (
                <div className="rounded-lg bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)] p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[var(--color-text-subtle)] uppercase">Error details</span>
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
        toast.success('Response JSON copied');
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
                    <span className="font-medium">Model response details</span>
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
    title, storeInstance, queryLabel, rephraseLabel, rephrasePlaceholder,
    emptyStateLabel, loadingLabel, extraHeaderActions, onStart, startLabel, startPlaceholder, useSection,
}: PageAiLookupPanelProps) {
    const pageStore = usePageStore();
    const themeStore = useThemeStore();
    const uiSettings = pageStore.uiSettingsStore;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const activeEntry = storeInstance.activeEntry;
    const [rephraseText, setRephraseText] = useState('');
    const [draft, setDraft] = useState('');
    const [composing, setComposing] = useState(false);
    const followupId = useId();
    const label = (entry: any): string => entry.searchTerm ?? entry.selectedText ?? '';
    useEffect(() => {
        setRephraseText(activeEntry ? label(activeEntry) : '');
        setComposing(false);
    }, [activeEntry?.id]);
    const submit = () => { if (draft.trim()) { onStart(draft.trim()); setDraft(''); setComposing(false); } };
    const reask = () => { if (activeEntry && rephraseText.trim()) storeInstance.reask(activeEntry.id, rephraseText.trim()); };
    const fontSizes = storeInstance.isExpanded ? uiSettings.fontSize.value : {
        ...uiSettings.fontSize.value, paragraph: 14, h1: 20, h2: 18, h3: 16, h4: 15, h5: 14, h6: 14,
        code: 12, equation: 14, blockquote: 13, callout: 14, listItem: 14, table: 12,
    };
    return <div className="reader-panel reader-ai-panel">
        <SidebarHeader title={title} actions={<>
            {storeInstance.history.length > 0 && <ReaderActionButton tooltip="New lookup" className="reader-icon-button" onClick={() => setComposing(value => !value)}><Plus size={15} /></ReaderActionButton>}
            {storeInstance.history.length > 0 && <ReaderActionButton tooltip="Clear lookup history" className="reader-icon-button" onClick={() => storeInstance.clearHistory()}><Trash2 size={14} /></ReaderActionButton>}
            <ReaderActionButton tooltip={storeInstance.isExpanded ? 'Restore sidebar' : 'Expand to full width'} className="reader-icon-button" onClick={() => storeInstance.toggleExpand()}>{storeInstance.isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</ReaderActionButton>
            <ReaderActionButton tooltip="Return to contents" className="reader-icon-button" onClick={() => storeInstance.close()}><X size={15} /></ReaderActionButton>
        </>} />
        {storeInstance.history.length > 0 && <div className="reader-panel-toolbar reader-ai-history-row">
            <Select ariaLabel={`${title} history`} tooltip="Recent lookups" value={storeInstance.activeEntryId} onValueChange={id => { if (id) { storeInstance.setActiveEntry(id); setComposing(false); } }} className="reader-ai-history" items={Object.fromEntries([...storeInstance.history].reverse().map(entry => [entry.id, `${entry.isLoading ? 'Loading: ' : entry.error ? 'Retry: ' : ''}${label(entry).slice(0, 100)}`]))} />
            {activeEntry && <ReaderActionButton tooltip="Remove current lookup" className="reader-icon-button" onClick={() => storeInstance.removeEntry(activeEntry.id)}><X size={13} /></ReaderActionButton>}
        </div>}
        <div className="reader-panel-scroll">
            {(!activeEntry || composing) && <>
                <SidebarEmpty title={title === 'Questions' ? 'Ask about what you’re reading' : title === 'Word meanings' ? 'Understand a word in context' : 'Make an idea clearer'}>{emptyStateLabel}</SidebarEmpty>
                <div className="reader-ai-compose">
                    <textarea aria-label={startPlaceholder} placeholder={startPlaceholder} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submit(); } }} />
                    <div className="reader-ai-compose-footer">{useSection ? <button className="reader-inline-action" disabled={!pageStore.currentSection} onClick={() => setDraft(pageStore.currentSection?.fullMarkdown ?? '')}>Use current section</button> : <span>Includes page and section context</span>}<Button size="sm" disabled={!draft.trim()} onClick={submit}>{startLabel}</Button></div>
                </div>
            </>}
            {activeEntry && !composing && <div className="reader-ai-body">
                <div className="reader-ai-query"><span className="reader-panel-meta">{queryLabel}</span><blockquote className="reader-panel-quote">{label(activeEntry)}</blockquote></div>
                {activeEntry.isLoading ? <div className="reader-ai-loading"><Loader size={20} /><span role="status">{loadingLabel}</span><Button size="sm" variant="ghost" onClick={() => storeInstance.cancel?.(activeEntry.id)}><Square size={12} />Cancel</Button></div> : activeEntry.error ? <ErrorCard errorDetails={activeEntry.errorDetails} fallbackError={activeEntry.error} onRetry={() => storeInstance.retry?.(activeEntry.id)} /> : <>
                    <div className="reader-ai-response-header"><span className="reader-panel-meta">AI response</span><div className="reader-panel-actions">
                        {extraHeaderActions?.(activeEntry)}
                        <ReaderActionButton tooltip="Regenerate response" className="reader-icon-button" onClick={() => storeInstance.retry?.(activeEntry.id)}><RotateCcw size={14} /></ReaderActionButton>
                        <ReaderActionButton tooltip="Copy response" className="reader-icon-button" onClick={() => { void navigator.clipboard.writeText(activeEntry.responseMarkdown).then(() => toast.success('Response copied'), () => toast.error('Couldn’t copy this response.')); }}><Copy size={14} /></ReaderActionButton>
                    </div></div>
                    <MarkdownRenderer markdown={activeEntry.responseMarkdown} colors={schema.value} fontSizes={fontSizes} fonts={uiSettings.fontFamilies.value} />
                    <RawResponseViewer rawResponse={activeEntry.rawResponse} />
                </>}
                {activeEntry.error && extraHeaderActions && <div className="reader-panel-actions">{extraHeaderActions(activeEntry)}</div>}
                {!activeEntry.isLoading && <div className="reader-ai-compose reader-ai-followup">
                    <label htmlFor={followupId}>{rephraseLabel}</label>
                    <textarea id={followupId} value={rephraseText} onChange={event => setRephraseText(event.target.value)} placeholder={rephrasePlaceholder} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); reask(); } }} />
                    <div className="reader-ai-compose-footer"><span>Ctrl / ⌘ + Enter</span><Button size="sm" variant="outlined" disabled={!rephraseText.trim()} onClick={reask}>Ask again</Button></div>
                </div>}
            </div>}
        </div>
    </div>;
});
