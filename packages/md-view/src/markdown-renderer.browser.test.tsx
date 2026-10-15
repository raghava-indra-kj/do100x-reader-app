// @vitest-environment jsdom
import { act, useEffect, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { MarkdownRenderer } from './markdown-renderer';
import { createDocument, hydrateDocument } from '@reader/md-ast';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('keeps embedded components mounted through CSS appearance changes', async () => {
  const mounted = vi.fn();
  const embeds = { quiz: () => { useEffect(() => { mounted(); }, []); return <aside>Quiz</aside>; } };
  const source = '```reader-component\n{"type":"quiz","id":"1"}\n```';
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(<MarkdownRenderer markdown={source} embeds={embeds} />); });
  await act(async () => { root.render(<MarkdownRenderer markdown={source} embeds={embeds} style={{ '--md-color-surfaceBg': '#111111' } as CSSProperties} />); });
  expect(container.querySelector('.md-view')?.getAttribute('data-md-scheme')).toBe('dark');
  expect(mounted).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
});

it('hydrates render-local IDs without mismatching server markup', async () => {
  const recoverable = vi.fn();
  const container = document.createElement('div'); document.body.append(container);
  container.innerHTML = renderToString(<MarkdownRenderer markdown="# Title\n\nParagraph" />);
  const before = [...container.querySelectorAll('[data-md-block-id]')].map(element => element.getAttribute('data-md-block-id'));
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, <MarkdownRenderer markdown="# Title\n\nParagraph" />, { onRecoverableError: recoverable }); });
  expect([...container.querySelectorAll('[data-md-block-id]')].map(element => element.getAttribute('data-md-block-id'))).toEqual(before);
  expect(recoverable).not.toHaveBeenCalled();
  await act(async () => root!.unmount());
});

it('retains embedded state when callbacks and equivalent document metadata change', async () => {
  const mounted = vi.fn(), first = vi.fn(), second = vi.fn();
  const embeds = { quiz: () => { useEffect(() => { mounted(); }, []); return <button>Quiz answer</button>; } };
  const model = createDocument('```reader-component\n{"type":"quiz","id":"1"}\n```');
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<MarkdownRenderer markdown={model.source} document={model} embeds={embeds} onBlockClick={first} renderBlockActions={() => <span>First</span>} />));
  const quiz = container.querySelector('button')!;
  await act(async () => root.render(<MarkdownRenderer markdown={model.source} document={hydrateDocument(JSON.parse(JSON.stringify(model)))} embeds={embeds} onBlockClick={second} renderBlockActions={() => <span>Second</span>} />));
  expect(container.querySelector('button')).toBe(quiz);
  expect(mounted).toHaveBeenCalledOnce();
  await act(async () => quiz.click());
  expect(second).toHaveBeenCalledOnce(); expect(first).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Second');
  await act(async () => root.unmount());
});

it('uses a host clipboard bridge and reports failure without claiming a successful copy', async () => {
  const copy = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Denied'));
  const source = 'const value = "unchanged";\n';
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<MarkdownRenderer markdown={'```ts\n' + source + '```'} onCopyText={copy} />));
  const button = container.querySelector<HTMLButtonElement>('.md-code-block-copy')!;
  await act(async () => button.click());
  expect(copy).toHaveBeenLastCalledWith(source);
  expect(button.getAttribute('aria-label')).toBe('Code copied');
  await act(async () => button.click());
  expect(button.getAttribute('aria-label')).toContain('Couldn’t copy');
  await act(async () => root.unmount());
});
