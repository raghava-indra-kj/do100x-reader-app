// @vitest-environment jsdom
import { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vocabulary } from '@domain/vocabulary/models/vocabulary';
import type { VocabularyUpdate } from '@domain/vocabulary/models/db-vocabulary';
import { TooltipProvider } from '@modules/core/ui/primitives/tooltip';
import { WordDetail, type NavigationGuard } from './word-detail';
const service = vi.hoisted(() => ({ save: vi.fn(), update: vi.fn() }));
vi.mock('@domain/vocabulary/services/vocabulary-service', () => ({ saveVocabularyExplanation: service.save, updateVocabulary: service.update }));
vi.mock('./markdown', () => ({ VocabularyMarkdown: ({ source }: { source: string }) => <div data-markdown>{source}</div> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const word = (patch: Partial<Vocabulary> = {}): Vocabulary => ({ id: 'word-a', term: 'important', explanationMarkdown: 'Saved explanation', practiceText: 'Saved sentence', difficulty: 'unrated', usageFrequency: 'unrated', learningStatus: 'learning', lastReviewedAt: null, createdAt: new Date('2026-10-15T08:00:00Z'), updatedAt: new Date('2026-10-15T08:00:00Z'), version: 1, ...patch });
const key = (user = 'user-a', id = 'word-a') => `reader:vocabulary-draft:${user}:${id}`;
const updated = vi.fn(), reloaded = vi.fn(), moved = vi.fn(), deleted = vi.fn(), back = vi.fn();
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, liveGuard: { current: NavigationGuard };
beforeEach(() => {
  sessionStorage.clear(); updated.mockReset(); reloaded.mockReset(); moved.mockReset(); deleted.mockReset(); back.mockReset();
  service.save.mockReset().mockImplementation(async (_id: string, version: number, text: string) => ({ ok: true, data: word({ explanationMarkdown: text, version: version + 1 }) }));
  service.update.mockReset().mockImplementation(async (_id: string, changes: VocabularyUpdate) => ({ ok: true, data: word({ ...changes, version: changes.expectedVersion + 1 }) }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia ??= vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden || this.style.display === 'none' ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
  HTMLElement.prototype.scrollIntoView ??= vi.fn();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Harness({ item = word(), userId = 'user-a' }: { item?: Vocabulary; userId?: string }) {
  const guard = useRef<NavigationGuard>(action => action()), headingRef = useRef<HTMLHeadingElement>(null), [revision, setRevision] = useState(0);
  liveGuard = guard;
  return <WordDetail key={`${item.id}:${revision}`} word={revision ? word({ version: 10, explanationMarkdown: 'Latest saved explanation', practiceText: 'Latest saved sentence' }) : item} userId={userId} guard={guard} headingRef={headingRef} onUpdated={updated} onDelete={deleted} onReload={() => { reloaded(); setRevision(value => value + 1); }} onBack={back} onMove={moved} position={2} count={4} canNext />;
}
async function render(item = word(), userId = 'user-a') { await act(async () => root.render(<MemoryRouter><TooltipProvider delay={0}><Harness item={item} userId={userId} /></TooltipProvider></MemoryRouter>)); await settle(); }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); }
function button(label: string) { return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label)!; }
function field(label: string) { const node = [...document.querySelectorAll<HTMLLabelElement>('label')].find(node => node.textContent?.startsWith(label))!; return document.getElementById(node.htmlFor) as HTMLTextAreaElement; }
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(); }
async function type(label: string, value: string) { const input = field(label); await act(async () => { input.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function press(key: string) { await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))); await settle(); }
function draft(user = 'user-a') { const text = sessionStorage.getItem(key(user)); return text ? JSON.parse(text) : null; }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

it.each([true, false])('focuses the explanation editor and returns to the surviving edit control (existing: %s)', async existing => {
  await render(word({ explanationMarkdown: existing ? 'Saved explanation' : null })); const label = existing ? 'Edit explanation' : 'Add explanation'; await click(button(label)); expect(document.activeElement).toBe(field('Explanation Markdown')); await click(button('Cancel')); expect(document.activeElement).toBe(button(label));
});
it('keeps the unsaved sentence when saving an explanation and uses its new version for the sentence', async () => {
  await render(); await click(button('Edit explanation')); await type('Explanation Markdown', 'New explanation'); await type('Your sentence', 'New sentence');
  await click(button('Save explanation')); expect(service.save).toHaveBeenCalledWith('word-a', 1, 'New explanation'); expect(field('Your sentence').value).toBe('New sentence'); expect(document.activeElement).toBe(button('Edit explanation')); expect(draft()).toMatchObject({ version: 2, explanation: 'New explanation', practice: 'New sentence', baseExplanation: 'New explanation', basePractice: 'Saved sentence' });
  service.update.mockResolvedValueOnce({ ok: true, data: word({ version: 3, explanationMarkdown: 'New explanation', practiceText: 'Normalized sentence' }) });
  await click(button('Save sentence')); expect(service.update).toHaveBeenCalledWith('word-a', { expectedVersion: 2, practiceText: 'New sentence', reviewed: true }); expect(field('Your sentence').value).toBe('Normalized sentence'); expect(sessionStorage.getItem(key())).toBeNull(); expect(document.activeElement).toBe(field('Your sentence'));
});
it('keeps the unsaved explanation when saving a sentence and advances its expected version', async () => {
  await render(); await click(button('Edit explanation')); await type('Explanation Markdown', 'Unsent explanation'); await type('Your sentence', 'New sentence'); await click(button('Save sentence'));
  expect(field('Explanation Markdown').value).toBe('Unsent explanation'); expect(document.activeElement).toBe(field('Your sentence')); expect(draft()).toMatchObject({ version: 2, explanation: 'Unsent explanation', practice: 'New sentence', baseExplanation: 'Saved explanation', basePractice: 'New sentence' });
  service.save.mockResolvedValueOnce({ ok: true, data: word({ version: 3, explanationMarkdown: 'Unsent explanation', practiceText: 'New sentence' }) }); await click(button('Save explanation')); expect(service.save).toHaveBeenCalledWith('word-a', 2, 'Unsent explanation'); expect(sessionStorage.getItem(key())).toBeNull();
});
it('confirms explanation cancellation without discarding a separate sentence draft', async () => {
  await render(); await click(button('Edit explanation')); await type('Explanation Markdown', 'Unsent explanation'); await type('Your sentence', 'Keep this sentence'); await click(button('Cancel')); expect(document.activeElement).toBe(button('Keep editing')); await press('Escape'); expect(field('Explanation Markdown').value).toBe('Unsent explanation'); expect(document.activeElement).toBe(field('Your sentence'));
  await click(button('Cancel')); await click(button('Discard changes')); expect(document.activeElement).toBe(button('Edit explanation')); expect(field('Your sentence').value).toBe('Keep this sentence'); expect(draft()).toMatchObject({ explanation: 'Saved explanation', practice: 'Keep this sentence' }); expect(service.save).not.toHaveBeenCalled(); expect(service.update).not.toHaveBeenCalled();
});
it('returns Keep editing to the sentence draft after saving removes the last-focused explanation editor', async () => {
  await render(); await type('Your sentence', 'Remaining sentence draft'); await click(button('Edit explanation')); await type('Explanation Markdown', 'New saved explanation');
  const previousField = field('Explanation Markdown'); await click(button('Save explanation'));
  expect(previousField.isConnected).toBe(false); expect(field('Your sentence').value).toBe('Remaining sentence draft'); expect(button('Save sentence')).toBeDefined();
  await click(button('Back to words')); expect(document.activeElement).toBe(button('Keep editing')); await click(button('Keep editing'));
  expect(back).not.toHaveBeenCalled(); expect(document.activeElement).toBe(field('Your sentence')); expect(field('Your sentence').value).toBe('Remaining sentence draft');
  expect(draft()).toMatchObject({ version: 2, explanation: 'New saved explanation', practice: 'Remaining sentence draft' });
});

describe.each(['explanation', 'sentence'] as const)('%s save failure and locking', kind => {
  it.each(['rejection', 'result-error'])('retains exact draft, releases the lock and permits retry after %s', async failure => {
    const pending = deferred<{ ok: true; data: Vocabulary } | { ok: false; error: { message: string } }>(), call = kind === 'explanation' ? service.save : service.update;
    call.mockReturnValueOnce(pending.promise); await render(); await click(button('Edit explanation')); await type('Explanation Markdown', 'Keep explanation'); await type('Your sentence', 'Keep sentence');
    const save = button(kind === 'explanation' ? 'Save explanation' : 'Save sentence'); await act(async () => { save.click(); save.click(); }); expect(call).toHaveBeenCalledTimes(1);
    expect([...document.querySelectorAll<HTMLElement>('.vocabulary-detail button,.vocabulary-detail textarea')].every(element => element.matches(':disabled'))).toBe(true);
    await type('Explanation Markdown', 'Blocked'); await type('Your sentence', 'Blocked'); await act(async () => liveGuard.current(reloaded)); expect(reloaded).not.toHaveBeenCalled();
    await act(async () => failure === 'rejection' ? pending.reject(new Error('Connection failed')) : pending.resolve({ ok: false, error: { message: 'Version conflict' } }));
    expect(field('Explanation Markdown').value).toBe('Keep explanation'); expect(field('Your sentence').value).toBe('Keep sentence'); expect(document.activeElement).toBe(document.querySelector('[role=alert]')); expect(field('Your sentence').disabled).toBe(false);
    await click(button(kind === 'explanation' ? 'Save explanation' : 'Save sentence')); expect(call).toHaveBeenCalledTimes(2); expect(updated).toHaveBeenCalledTimes(1);
  });
});
it('restores per-user drafts as information and preserves an old-version conflict until explicit reload', async () => {
  sessionStorage.setItem(key(), JSON.stringify({ version: 2, explanation: 'Recovered explanation', practice: 'Recovered sentence', baseExplanation: 'Earlier explanation', basePractice: 'Earlier sentence' }));
  await render(word({ version: 9 })); expect(document.querySelector('[role=status]')?.textContent).toContain('restored'); expect(document.querySelector('[role=alert]')).toBeNull(); expect(field('Explanation Markdown').value).toBe('Recovered explanation');
  service.save.mockResolvedValueOnce({ ok: false, error: { message: 'The word changed elsewhere. Reload before saving.' } }); await click(button('Save explanation')); expect(service.save).toHaveBeenCalledWith('word-a', 2, 'Recovered explanation'); expect(field('Your sentence').value).toBe('Recovered sentence');
  await click(button('Reload word')); await click(button('Keep editing')); expect(reloaded).not.toHaveBeenCalled(); expect(draft()?.practice).toBe('Recovered sentence');
  await click(button('Reload word')); await click(button('Discard changes')); expect(reloaded).toHaveBeenCalledTimes(1); expect(sessionStorage.getItem(key())).toBeNull(); expect(field('Your sentence').value).toBe('Latest saved sentence'); expect(document.querySelector('[role=alert]')).toBeNull();
});
it('ignores a deferred response after an account changes, keeping each account draft isolated', async () => {
  const pending = deferred<{ ok: true; data: Vocabulary }>(); service.save.mockReturnValueOnce(pending.promise); await render(); await click(button('Edit explanation')); await type('Explanation Markdown', 'Account A draft'); await click(button('Save explanation'));
  await render(word({ practiceText: 'Account B sentence' }), 'user-b'); await act(async () => pending.resolve({ ok: true, data: word({ explanationMarkdown: 'Account A saved', version: 2 }) })); expect(updated).not.toHaveBeenCalled(); expect(field('Your sentence').value).toBe('Account B sentence'); expect(draft('user-a')?.explanation).toBe('Account A draft'); expect(draft('user-b')).toBeNull();
});
it.each(['replacement', 'unmount'])('ignores late sentence completion after word %s', async mode => {
  const pending = deferred<{ ok: true; data: Vocabulary }>(); service.update.mockReturnValueOnce(pending.promise); await render(); await type('Your sentence', 'Old draft'); await click(button('Save sentence'));
  if (mode === 'replacement') await render(word({ id: 'word-b', term: 'different', practiceText: 'Different sentence' })); else await act(async () => root.render(<div>Closed</div>));
  await act(async () => pending.resolve({ ok: true, data: word({ practiceText: 'Old draft', version: 2 }) })); expect(updated).not.toHaveBeenCalled(); expect(sessionStorage.getItem(key())).toContain('Old draft'); if (mode === 'replacement') expect(field('Your sentence').value).toBe('Different sentence');
});
it('uses a custom keyboard selector and custom tooltip with no native titles', async () => {
  await render(); expect(document.querySelector('select')).toBeNull(); expect(document.querySelector('[title]')).toBeNull();
  await act(async () => button('Reload word').focus()); await settle(); expect(button('Reload word').hasAttribute('data-popup-open')).toBe(true); expect(document.querySelector('[data-base-ui-portal] [data-instant=focus][tabindex]')?.textContent).toBe('Reload word');
  const difficulty = button('Difficulty'); await click(difficulty); expect(document.querySelector('[role=listbox]')).not.toBeNull(); await press('ArrowDown'); await press('Enter'); expect(service.update).toHaveBeenCalledWith('word-a', { expectedVersion: 1, difficulty: 'easy' });
});
