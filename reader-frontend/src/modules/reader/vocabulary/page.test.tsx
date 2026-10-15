// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { observable, runInAction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vocabulary } from '@domain/vocabulary/models/vocabulary';
import { VocabularySummarySchema } from '@domain/vocabulary/models/db-vocabulary';

const fixture = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), create: vi.fn(), remove: vi.fn(), update: vi.fn(), save: vi.fn(), toast: vi.fn(), auth: null as any }));
vi.mock('@domain/vocabulary/services/vocabulary-service', () => ({ getVocabulary: fixture.list, readVocabulary: fixture.read, createVocabulary: fixture.create, deleteVocabulary: fixture.remove, updateVocabulary: fixture.update, saveVocabularyExplanation: fixture.save }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => fixture.auth }));
vi.mock('@modules/core/ui/components/appbar/appbar-layout', () => ({ AppBarLayout: () => null }));
vi.mock('@modules/reader/search/page-search', () => ({ ReaderPageSearch: () => null }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: any) => children }));
vi.mock('@modules/core/ui/primitives/toast/toast', () => ({ toast: { success: fixture.toast } }));
vi.mock('./markdown', () => ({ VocabularyMarkdown: ({ source }: { source: string }) => <p>{source}</p> }));
import VocabularyPage from './page';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const word = (id: string, patch: Partial<Vocabulary> = {}): Vocabulary => ({ id, term: id === 'a' ? 'Important' : id === 'b' ? 'Thoughtful' : id, explanationMarkdown: 'A useful meaning.', difficulty: 'unrated', usageFrequency: 'unrated', learningStatus: 'learning', practiceText: '', lastReviewedAt: null, createdAt: new Date('2026-10-15T08:00:00Z'), updatedAt: new Date('2026-10-15T08:00:00Z'), version: 1, ...patch });
const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, error: new Error(message) });
const list = (words: Vocabulary[], nextOffset: number | null = null, total = words.length) => ok({ items: words.map(item => VocabularySummarySchema.parse({ ...item, hasExplanation: Boolean(item.explanationMarkdown) })), total, nextOffset });
function deferred<T>() { let resolve!: (value: T) => void, reject!: (reason: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear(); fixture.auth = observable({ currentUser: { id: 'account-a' } });
  fixture.list.mockResolvedValue(list([word('a'), word('b')])); fixture.read.mockImplementation(async (id: string) => ok(word(id)));
  fixture.create.mockResolvedValue(ok({ word: word('new'), created: true })); fixture.remove.mockResolvedValue(ok(undefined)); fixture.update.mockImplementation(async (id: string, changes: Partial<Vocabulary>) => ok(word(id, { ...changes, version: 2 })));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia ??= vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden || this.style.display === 'none' ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function settle(ms = 25) { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); }
async function render(path = '/reader/vocabulary') { await act(async () => root.render(<MemoryRouter initialEntries={[path]}><VocabularyPage /></MemoryRouter>)); await settle(); }
function button(label: string, scope: ParentNode = document) { const result = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label); if (!result) throw new Error(`Missing button ${label}`); return result; }
const row = (term: string) => [...document.querySelectorAll<HTMLButtonElement>('.vocabulary-word-row')].find(button => button.querySelector('span')?.textContent === term)!;
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(); }
async function input(label: string, value: string) { const field = document.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!; await act(async () => { field.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function choose(label: string, value: string) { await click(button(label)); const option = [...document.querySelectorAll<HTMLElement>('[role=option]')].find(item => item.textContent === value)!; await act(async () => { option.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })); option.click(); }); await settle(); }

describe('Vocabulary navigation and recovery', () => {
  it('does not steal focus for the initial desktop selection, but focuses explicit opens and returns to their row', async () => {
    const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise);
    await render(); const search = document.querySelector<HTMLInputElement>('[aria-label="Search saved words"]')!; search.focus();
    await act(async () => pending.resolve(list([word('a'), word('b')]))); await settle();
    expect(document.activeElement).toBe(search);
    await click(row('Thoughtful')); expect(document.activeElement).toBe(document.querySelector('.vocabulary-word-header h1')); expect(document.activeElement?.textContent).toBe('Thoughtful');
    await click(button('Back to words')); expect(document.activeElement).toBe(row('Thoughtful')); expect(document.querySelector('.vocabulary-show-detail')).toBeNull();
  });

  it('shows a failed explicit read in the main pane and retries the same word with focus recovery', async () => {
    await render(); fixture.read.mockResolvedValueOnce(fail('Offline — try again')); await click(row('Thoughtful'));
    expect(document.querySelector('.vocabulary-show-detail')).not.toBeNull();
    expect(document.querySelector('.vocabulary-main [role=alert]')?.textContent).toBe('Offline — try again');
    expect(document.querySelector('.vocabulary-detail-state h1')?.textContent).toContain('Thoughtful');
    expect(document.activeElement).toBe(document.querySelector('.vocabulary-detail-state h1'));
    expect(document.querySelector('.vocabulary-list [role=alert]')).toBeNull();
    await click(button('Retry word')); expect(fixture.read).toHaveBeenLastCalledWith('b'); expect(document.activeElement?.textContent).toBe('Thoughtful');
    await click(button('Back to words')); expect(document.activeElement).toBe(row('Thoughtful'));
  });

  it('preserves failed Reload identity and does not reopen a word after Back cancels its pending read', async () => {
    await render(); await click(row('Thoughtful')); fixture.read.mockResolvedValueOnce(fail('Cannot reload this word'));
    await click(button('Reload word')); expect(document.querySelector('.vocabulary-main [role=alert]')?.textContent).toContain('Cannot reload');
    const pending = deferred<ReturnType<typeof ok<Vocabulary>>>(); fixture.read.mockReturnValueOnce(pending.promise);
    await click(button('Retry word')); expect(document.activeElement?.getAttribute('role')).toBe('status');
    await click(button('Back to words')); expect(document.activeElement).toBe(row('Thoughtful'));
    await act(async () => pending.resolve(ok(word('b', { term: 'Late old detail' }))));
    expect(document.querySelector('.vocabulary-show-detail')).toBeNull(); expect(document.querySelector('.vocabulary-main')?.textContent).not.toContain('Late old detail');
  });

  it('uses custom selectors and distinguishes filtered empty results with an explicit reset', async () => {
    await render(); await click(button('Filter words')); expect(document.querySelector('select')).toBeNull(); expect(document.querySelector('[title]')).toBeNull();
    fixture.list.mockResolvedValueOnce(list([])); await choose('Filter difficulty', 'Difficult');
    expect(fixture.list).toHaveBeenLastCalledWith(expect.objectContaining({ difficulty: 'difficult' }));
    expect(document.querySelector('.vocabulary-word-list')?.textContent).toContain('No words match');
    await click(button('Clear filters')); expect(fixture.list).toHaveBeenLastCalledWith(expect.objectContaining({ difficulty: undefined }));
    expect(document.activeElement).toBe(document.querySelector('[aria-label="Search saved words"]'));
    expect(document.querySelectorAll('.vocabulary-word-row')).toHaveLength(2);
    fixture.list.mockResolvedValueOnce(list([])); await click(button('Refresh words'));
    expect(document.querySelector('.vocabulary-word-list')?.textContent).toContain('No saved words yet');
  });

  it('reads an explicitly linked word outside the current filter only once and keeps its failure recoverable', async () => {
    fixture.read.mockResolvedValueOnce(fail('Word unavailable')); await render('/reader/vocabulary?word=outside');
    expect(fixture.read).toHaveBeenCalledExactlyOnceWith('outside'); expect(document.querySelector('.vocabulary-main [role=alert]')?.textContent).toContain('Word unavailable');
    await click(button('Back to words')); expect(document.activeElement).toBe(document.querySelector('[aria-label="Search saved words"]'));
  });
});

describe('Vocabulary request ownership', () => {
  it('locks duplicate Load more activations and keeps the mounted detail while loading', async () => {
    fixture.list.mockResolvedValueOnce(list([word('a')], 50, 3)); await render();
    const detail = document.querySelector('.vocabulary-detail'), pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise);
    const load = button('Load more'); await act(async () => { load.click(); load.click(); });
    expect(fixture.list).toHaveBeenCalledTimes(2); expect(fixture.list).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })); expect(document.querySelector('.vocabulary-detail')).toBe(detail);
    await act(async () => pending.resolve(list([word('a'), word('b')], null, 2)));
    expect(document.querySelectorAll('.vocabulary-word-row')).toHaveLength(2);
  });

  it('does not replace a sentence draft started while the queue is refreshing', async () => {
    await render(); const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise);
    await click(button('Refresh words')); const field = document.querySelector<HTMLTextAreaElement>('.vocabulary-practice textarea')!;
    await act(async () => { field.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'A thought written while loading'); field.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => pending.resolve(list([word('a'), word('b')]))); await settle();
    expect(document.querySelector('.vocabulary-practice textarea')).toBe(field); expect(field.value).toBe('A thought written while loading'); expect(document.activeElement).toBe(field);
    expect(fixture.read).toHaveBeenCalledTimes(1);
  });

  it('guards replacement selection when a sentence is typed after changing a filter', async () => {
    await render(); await click(button('Filter words')); const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise);
    await choose('Filter difficulty', 'Difficult'); const field = document.querySelector<HTMLTextAreaElement>('.vocabulary-practice textarea')!;
    await act(async () => { field.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'Keep my thought'); field.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => pending.resolve(list([word('b')]))); await settle();
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Discard unsaved changes');
    await click(button('Keep editing')); expect(document.querySelector('.vocabulary-practice textarea')).toBe(field); expect(field.value).toBe('Keep my thought');
  });

  it('rechecks the draft guard before page-boundary Next opens the returned word', async () => {
    fixture.list.mockResolvedValueOnce(list([word('a')], 50, 2)); await render();
    const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise); await click(button('Next word'));
    const field = document.querySelector<HTMLTextAreaElement>('.vocabulary-practice textarea')!;
    await act(async () => { field.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'Still writing'); field.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => pending.resolve(list([word('b')], null, 2))); await settle(); await click(button('Keep editing'));
    expect(document.querySelector('.vocabulary-practice textarea')).toBe(field); expect(field.value).toBe('Still writing'); expect(fixture.read).toHaveBeenCalledTimes(1);
  });

  it('shows boundary failures beside the current detail, retries the exact offset, and cancels navigation on Back', async () => {
    fixture.list.mockResolvedValueOnce(list([word('a')], 50, 2)); await render(); await click(row('Important'));
    const detail = document.querySelector('.vocabulary-detail'); fixture.list.mockResolvedValueOnce(fail('Offline'));
    await click(button('Next word')); expect(document.querySelector('.vocabulary-main [role=alert]')?.textContent).toContain('Offline'); expect(document.querySelector('.vocabulary-detail')).toBe(detail);
    const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise); await click(button('Retry next word'));
    expect(fixture.list).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 }));
    await click(button('Back to words')); expect(document.activeElement).toBe(row('Important'));
    await act(async () => pending.resolve(list([word('b')], null, 2))); await settle();
    expect(document.querySelector('.vocabulary-show-detail')).toBeNull(); expect(document.querySelector('.vocabulary-navigation-error')).toBeNull(); expect(document.activeElement).toBe(row('Important'));
  });

  it('reissues an active filtered replacement after saving invalidates its older result', async () => {
    await render(); await click(button('Filter words')); const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(list([word('b')]));
    await choose('Filter difficulty', 'Difficult'); await click(button('Mark learned'));
    expect(fixture.list).toHaveBeenLastCalledWith(expect.objectContaining({ difficulty: 'difficult' })); expect(fixture.list).toHaveBeenCalledTimes(3);
    expect(row('Thoughtful')).toBeDefined(); expect(row('Important')).toBeUndefined();
    await act(async () => pending.resolve(list([word('a')]))); expect(row('Important')).toBeUndefined();
  });

  it('resumes a pre-existing debounced search after failed Add without hiding its error or draft', async () => {
    await render(); await input('Search saved words', 'unmatched'); await input('New word or phrase', 'Keep this word');
    const pending = deferred<ReturnType<typeof fail>>(); fixture.create.mockReturnValueOnce(pending.promise);
    await click(button('Save word')); await settle(230);
    expect(document.querySelector('[aria-label="Search saved words"]')?.matches(':disabled')).toBe(true); expect(fixture.list).toHaveBeenCalledTimes(1);
    fixture.list.mockImplementation(async (query: { search?: string }) => list(query.search ? [] : [word('a'), word('b')]));
    await act(async () => pending.resolve(fail('Save failed'))); await settle(230);
    expect(fixture.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'unmatched' })); expect(document.querySelector('.vocabulary-word-list')?.textContent).toContain('No words match');
    expect(document.querySelector('.vocabulary-add-error')?.textContent).toBe('Save failed'); expect((document.querySelector('[aria-label="New word or phrase"]') as HTMLInputElement).value).toBe('Keep this word');
  });

  it('returns deletion focus to a surviving row before and after a delayed queue refresh', async () => {
    await render(); await click(row('Important')); await click(button('Delete word'));
    const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise);
    await click(button('Delete word', document.querySelector('[role=dialog]')!));
    expect(row('Important')).toBeUndefined(); expect(document.activeElement).toBe(row('Thoughtful'));
    await act(async () => pending.resolve(list([word('b')]))); await settle(); expect(document.activeElement).toBe(row('Thoughtful'));
  });

  it('does not let a pending page load overwrite a subsequently acknowledged detail edit', async () => {
    fixture.list.mockResolvedValueOnce(list([word('a')], 50, 2)); await render();
    const pending = deferred<ReturnType<typeof list>>(); fixture.list.mockReturnValueOnce(pending.promise); await click(button('Load more'));
    await click(button('Mark learned')); expect(row('Important')?.textContent).toContain('Learned');
    await act(async () => pending.resolve(list([word('a'), word('b')], null, 2)));
    expect(row('Important')?.textContent).toContain('Learned'); expect(document.querySelector('.vocabulary-detail')?.textContent).toContain('Review again'); expect(row('Thoughtful')).toBeUndefined();
  });

  it('keeps an add failure and draft, prevents duplicate creates, and ignores completion after account disposal', async () => {
    await render(); await input('New word or phrase', 'A new phrase'); fixture.create.mockResolvedValueOnce(fail('Unable to save'));
    await click(button('Save word')); expect((document.querySelector('[aria-label="New word or phrase"]') as HTMLInputElement).value).toBe('A new phrase'); expect(document.querySelector('.vocabulary-list [role=alert]')?.textContent).toBe('Unable to save');
    const pending = deferred<ReturnType<typeof ok<{ word: Vocabulary; created: boolean }>>>(); fixture.create.mockReturnValueOnce(pending.promise);
    const form = document.querySelector('.vocabulary-add')!; await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(fixture.create).toHaveBeenCalledTimes(2); expect(fixture.create).toHaveBeenLastCalledWith({ term: 'A new phrase' });
    fixture.list.mockResolvedValue(list([word('other', { term: 'Another account' })])); await act(async () => runInAction(() => { fixture.auth.currentUser.id = 'account-b'; })); await settle();
    await act(async () => pending.resolve(ok({ word: word('private'), created: true })));
    expect(fixture.toast).not.toHaveBeenCalled(); expect(document.body.textContent).toContain('Another account'); expect((document.querySelector('[aria-label="New word or phrase"]') as HTMLInputElement).value).toBe('');
  });

  it('ignores a prior account’s late list and detail responses', async () => {
    const pending = deferred<ReturnType<typeof ok<Vocabulary>>>(); await render(); fixture.read.mockReturnValueOnce(pending.promise); await click(row('Thoughtful'));
    fixture.list.mockResolvedValue(list([word('other', { term: 'Another account' })])); await act(async () => runInAction(() => { fixture.auth.currentUser.id = 'account-b'; })); await settle();
    await act(async () => pending.resolve(ok(word('b', { term: 'Private previous account' }))));
    expect(document.body.textContent).not.toContain('Private previous account'); expect(document.body.textContent).toContain('Another account');
  });
});
