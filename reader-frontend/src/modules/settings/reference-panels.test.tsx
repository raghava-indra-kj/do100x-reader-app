// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';
import { GuidePanel, McpPanel } from './reference-panels';
import GuideTopics from './guide-topics';

vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ currentUser: { id: 'test-user' } }) }));
const { errorToast } = vi.hoisted(() => ({ errorToast: vi.fn() }));
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { error: errorToast } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const writeText = vi.fn<(value: string) => Promise<void>>();
const button = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  writeText.mockReset().mockResolvedValue();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  Reflect.deleteProperty(navigator, 'clipboard');
});

it('copies the complete hidden address and compatible client JSON after the clipboard accepts the write', async () => {
  await act(async () => root.render(<McpPanel />));
  const url = window.location.origin + '/sse/test-user';
  expect(host.textContent).not.toContain('test-user');
  let resolve!: () => void;
  writeText.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
  await act(async () => button('Copy URL').click());
  expect(writeText).toHaveBeenCalledWith(url);
  expect(button('Copy URL').textContent).toBe('Copy URL');
  await act(async () => resolve());
  expect(button('Copy URL — copied').textContent).toBe('Copied');
  await act(async () => button('Copy JSON').click());
  expect(JSON.parse(writeText.mock.lastCall![0])).toEqual({ mcpServers: { do100x: { serverUrl: url } } });
  await act(async () => button('Show private URL').click());
  expect(host.querySelector('pre')?.textContent).toContain(url);
  await act(async () => button('Hide private URL').click());
  expect(host.textContent).not.toContain('test-user');
});

it('preserves masking and gives manual instructions when the clipboard denies an MCP copy', async () => {
  writeText.mockRejectedValueOnce(new Error('denied'));
  await act(async () => root.render(<McpPanel />));
  await act(async () => button('Copy JSON').click());
  expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('Reveal the private URL'));
  expect(host.textContent).not.toContain('test-user');
  expect(button('Copy JSON').textContent).toBe('Copy JSON');
});

it('renders the guide by topic and copies the full original Markdown', async () => {
  await act(async () => root.render(<GuideTopics />));
  const topics = [...host.querySelectorAll('details')];
  expect(topics.map(topic => topic.querySelector('summary')?.textContent)).toEqual(['Core', expect.stringContaining('Raw HTML'), 'Not supported', 'Checklist']);
  await act(async () => topics[0].querySelector('summary')!.click());
  expect(topics[0].open).toBe(true);
  expect(topics[0].querySelector('table')).not.toBeNull();
  expect(topics[1].querySelector('pre code')?.textContent).toContain('<callout');
  await act(async () => root.render(<GuidePanel />));
  await act(async () => button('Copy guide').click());
  expect(writeText).toHaveBeenCalledWith(FORMAT_LLM_MD_CONTENT);
  writeText.mockRejectedValueOnce(new Error('denied'));
  await act(async () => button('Copy guide — copied').click());
  const manual = document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!;
  expect(manual.value).toBe(FORMAT_LLM_MD_CONTENT);
  expect(manual.selectionEnd - manual.selectionStart).toBe(FORMAT_LLM_MD_CONTENT.length);
});
