import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { X, Search, RotateCcw } from 'lucide-react';
import { usePageStore } from '../store';
import type { DictionaryEntry, DictionarySense } from '@domain/dictionary/models/dictionary-models';

function SenseItem({ sense, index }: { sense: DictionarySense; index: number }) {
    return (
        <li className="flex flex-col gap-1">
            <p className="text-sm text-[var(--color-text-body)]">
                <span className="text-[var(--color-text-muted)] mr-1.5">{index}.</span>
                {sense.definition}
            </p>
            {sense.examples.length > 0 && (
                <div className="flex flex-col gap-0.5 ml-4">
                    {sense.examples.map((ex, i) => (
                        <p key={i} className="text-xs text-[var(--color-text-muted)] italic">"{ex}"</p>
                    ))}
                </div>
            )}
            {sense.synonyms.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] ml-4">
                    <span className="font-medium">Synonyms:</span> {sense.synonyms.join(', ')}
                </p>
            )}
            {sense.antonyms.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] ml-4">
                    <span className="font-medium">Antonyms:</span> {sense.antonyms.join(', ')}
                </p>
            )}
            {sense.subsenses.length > 0 && (
                <ol className="flex flex-col gap-1.5 ml-4 mt-1">
                    {sense.subsenses.map((sub, i) => (
                        <SenseItem key={i} sense={sub} index={i + 1} />
                    ))}
                </ol>
            )}
        </li>
    );
}

function EntryCard({ entry }: { entry: DictionaryEntry }) {
    const ipaPronunciation = entry.pronunciations.find(p => p.type === 'ipa');

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-[var(--color-brand)] capitalize">{entry.partOfSpeech}</span>
                {ipaPronunciation && (
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">{ipaPronunciation.text}</span>
                )}
            </div>
            {entry.senses.length > 0 && (
                <ol className="flex flex-col gap-2">
                    {entry.senses.map((sense, i) => (
                        <SenseItem key={i} sense={sense} index={i + 1} />
                    ))}
                </ol>
            )}
            {entry.synonyms.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">
                    <span className="font-medium">Synonyms:</span> {entry.synonyms.join(', ')}
                </p>
            )}
            {entry.antonyms.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">
                    <span className="font-medium">Antonyms:</span> {entry.antonyms.join(', ')}
                </p>
            )}
        </div>
    );
}

export const DictionaryPanel = observer(function DictionaryPanel() {
    const store = usePageStore();
    const dictStore = store.dictionaryStore;

    const handleSearch = useCallback(() => {
        dictStore.lookup();
    }, [dictStore]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    }, [handleSearch]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-4 pt-4 pb-2">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">Dictionary</span>
                <button
                    onClick={() => dictStore.close()}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                    title="Close dictionary"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2 shrink-0">
                <input
                    type="text"
                    value={dictStore.searchWord}
                    onChange={(e) => dictStore.setSearchWord(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search a word…"
                    className="flex-1 min-w-0 border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-1.5 text-sm rounded-[var(--radius-md)] transition-colors outline-none focus:border-[var(--color-brand)]"
                    autoFocus
                />
                <button
                    onClick={handleSearch}
                    disabled={!dictStore.searchWord.trim()}
                    className="shrink-0 p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Search"
                >
                    <Search size={16} />
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {dictStore.lookupState.isInit && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <Search size={24} className="text-[var(--color-text-subtle)]" />
                        <p className="text-sm text-[var(--color-text-muted)]">Search for a word to see its definition</p>
                    </div>
                )}

                {dictStore.lookupState.isLoading && (
                    <div className="flex flex-col gap-3 pt-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2 animate-pulse">
                                <div className="h-4 w-20 rounded bg-[var(--color-surface-soft)]" />
                                <div className="h-3 w-full rounded bg-[var(--color-surface-soft)]" />
                                <div className="h-3 w-3/4 rounded bg-[var(--color-surface-soft)]" />
                            </div>
                        ))}
                    </div>
                )}

                {dictStore.lookupState.isError && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">{dictStore.lookupState.error.message}</p>
                        <button
                            onClick={handleSearch}
                            className="flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline cursor-pointer"
                        >
                            <RotateCcw size={12} />
                            <span>Try again</span>
                        </button>
                    </div>
                )}

                {dictStore.lookupState.isLoaded && (() => {
                    const result = dictStore.lookupState.value;
                    return (
                        <div className="flex flex-col gap-4 pt-2">
                            {/* Word header */}
                            <h3 className="text-lg font-semibold text-[var(--color-text-strong)] font-[family-name:var(--font-serif)]">
                                {result.word}
                            </h3>

                            {/* Entries grouped by part of speech */}
                            <div className="flex flex-col gap-4">
                                {result.entries.map((entry, i) => (
                                    <EntryCard key={i} entry={entry} />
                                ))}
                            </div>

                            {/* Source attribution */}
                            <div className="border-t border-[var(--color-border-subtle)] pt-3 mt-2">
                                <p className="text-[10px] text-[var(--color-text-subtle)]">
                                    Source:{' '}
                                    <a
                                        href={result.source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-[var(--color-text-muted)]"
                                    >
                                        Wiktionary
                                    </a>
                                    {' · '}
                                    <a
                                        href={result.source.license.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-[var(--color-text-muted)]"
                                    >
                                        {result.source.license.name}
                                    </a>
                                    {' · '}
                                    <a
                                        href="https://freedictionaryapi.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-[var(--color-text-muted)]"
                                    >
                                        FreeDictionaryAPI.com
                                    </a>
                                </p>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
});
