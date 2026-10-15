// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTextSelection } from './use-text-selection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
const originalBounds = Range.prototype.getBoundingClientRect;
afterEach(async () => {
    await act(async () => root?.unmount()); root = undefined;
    document.body.innerHTML = ''; window.getSelection()?.removeAllRanges();
    if (originalBounds) Range.prototype.getBoundingClientRect = originalBounds;
    else delete (Range.prototype as Partial<Range>).getBoundingClientRect;
    vi.unstubAllGlobals();
});
function Probe() {
    const content = useRef<HTMLDivElement>(null), tools = useRef<HTMLDivElement>(null);
    const selection = useTextSelection(content, tools);
    return <><main><div ref={content} data-reading>Selected passage</div></main><div ref={tools}>{selection && <button onClick={() => { window.getSelection()?.removeAllRanges(); selection.dismiss?.(); }}>{selection.keyboard ? 'Keyboard tools' : 'Pointer tools'}</button>}</div></>;
}

describe('Reader selection lifecycle', () => {
    it('distinguishes keyboard selection and explicitly clears closed selection state before scrolling', async () => {
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        Range.prototype.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
        const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
        await act(async () => root!.render(<Probe />));
        const node = document.querySelector('[data-reading]')!.firstChild!;
        const range = document.createRange(); range.selectNodeContents(node); window.getSelection()?.addRange(range);
        await act(async () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', shiftKey: true, bubbles: true })));
        expect(document.querySelector('button')?.textContent).toBe('Keyboard tools');
        await act(async () => document.querySelector('button')!.click());
        await act(async () => document.querySelector('main')!.dispatchEvent(new Event('scroll')));
        expect(document.querySelector('button')).toBeNull();
        window.getSelection()?.addRange(range);
        await act(async () => document.querySelector('[data-reading]')!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
        expect(document.querySelector('button')?.textContent).toBe('Pointer tools');
    });
});
