// @vitest-environment jsdom
import { act, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { MermaidConfig } from 'mermaid';
import { MarkdownRenderer } from '../../markdown-renderer';

const initialize = vi.hoisted(() => vi.fn<(config: MermaidConfig) => void>());
vi.mock('mermaid', () => ({ default: {
  initialize,
  parse: async () => true,
  render: async () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }),
} }));

it('pairs sequence and edge labels with their own fills while preserving custom node colors', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  const style = {
    '--md-color-surfaceBg': '#faf6ef', '--md-color-codeBlockBg': '#252a30',
    '--md-color-body': '#3c3833', '--md-color-calloutBg': '#f4ecdf', '--md-color-calloutText': '#46392c',
    '--md-mermaid-primaryColor': '#315bd6', '--md-mermaid-primaryTextColor': '#ffffff',
  } as CSSProperties;
  try {
    await act(async () => root.render(<MarkdownRenderer markdown={'```mermaid\nflowchart LR\nA -->|read| B\n```'} style={style} />));
    await vi.waitFor(() => expect(host.querySelector('.md-mermaid svg')).toBeTruthy());
    const config = initialize.mock.lastCall?.[0];
    expect(config?.themeVariables).toMatchObject({
      background: '#faf6ef', lineColor: '#3c3833', arrowheadColor: '#3c3833',
      primaryColor: '#315bd6', nodeTextColor: '#ffffff',
      noteBkgColor: '#f4ecdf', noteTextColor: '#46392c', edgeLabelBackground: '#f4ecdf',
    });
    expect(config?.themeCSS).toContain('#46392c');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
