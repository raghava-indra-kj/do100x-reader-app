// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { useDialogFocus } from './use-dialog-focus';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('focuses the dialog, wraps Tab navigation and restores the opener', async () => {
  const opener = document.createElement('button'); const container = document.createElement('div');
  document.body.append(opener, container); opener.focus();
  const root = createRoot(container);
  function Dialog() {
    const ref = useRef<HTMLDivElement>(null); useDialogFocus(ref);
    return <div ref={ref}><button>Zoom</button><button aria-label="Close fullscreen">Close</button></div>;
  }
  await act(async () => root.render(<Dialog />));
  const [first, last] = container.querySelectorAll('button');
  expect(document.activeElement).toBe(last);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
  expect(document.activeElement).toBe(first);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true }));
  expect(document.activeElement).toBe(last);
  await act(async () => root.unmount());
  expect(document.activeElement).toBe(opener);
  opener.remove(); container.remove();
});
