import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const feedback = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@modules/core/ui/primitives/toast/toast', () => ({ toast: feedback }));
import { copyReaderText } from './reader-clipboard';
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

it('does not announce success before the clipboard write completes', async () => {
    let complete!: () => void;
    const writeText = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const copied = copyReaderText('Section content', 'Section copied');
    expect(writeText).toHaveBeenCalledWith('Section content');
    expect(feedback.success).not.toHaveBeenCalled();
    complete();
    expect(await copied).toBe(true);
    expect(feedback.success).toHaveBeenCalledWith('Section copied');
});
it.each([undefined, { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) }])('handles unavailable or denied clipboard without false success', async clipboard => {
    vi.stubGlobal('navigator', { clipboard });
    expect(await copyReaderText('Private note', 'Copied')).toBe(false);
    expect(feedback.success).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalledWith(expect.stringContaining('Couldn’t copy'));
});
