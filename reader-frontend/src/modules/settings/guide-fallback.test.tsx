// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';
import { GuidePanel } from './reference-panels';

vi.mock('./guide-topics', () => { throw new Error('Guide preview unavailable'); });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('keeps the full Markdown and copy action available when the formatted guide fails to load', async () => {
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await act(async () => root.render(<StrictMode><GuidePanel /></StrictMode>));
    expect(host.querySelector('pre[aria-label="Original guide Markdown"]')?.textContent).toBe(FORMAT_LLM_MD_CONTENT);
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Copy guide"]')!.click());
    expect(writeText).toHaveBeenCalledWith(FORMAT_LLM_MD_CONTENT);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    Reflect.deleteProperty(navigator, 'clipboard');
    log.mockRestore();
  }
});
