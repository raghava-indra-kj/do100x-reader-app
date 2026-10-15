import { describe, expect, it, vi } from 'vitest';
import type { D2, CompileRequest, CompileResponse } from '@d2lang/d2';
import { createD2Client } from './d2-instance';

describe('D2 worker request isolation', () => {
  it('serializes simultaneous requests and recovers after a compile error', async () => {
    let active = 0; let maximum = 0;
    const engine = {
      compile: vi.fn(async (input: CompileRequest) => {
        active++; maximum = Math.max(maximum, active);
        await Promise.resolve(); active--;
        if (input.fs.index === 'bad') throw new Error('syntax');
        return { inputPath: input.fs.index } as CompileResponse;
      }),
      render: vi.fn(async () => '<svg/>'),
    } as unknown as D2;
    const client = createD2Client(async () => engine);
    const results = await Promise.allSettled(['first', 'bad', 'last'].map(source => client.compile({ fs: { index: source }, options: {} })));
    expect(maximum).toBe(1);
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    expect((results[2] as PromiseFulfilledResult<CompileResponse>).value.inputPath).toBe('last');
  });

  it('discards and terminates a stuck worker before subsequent requests', async () => {
    vi.useFakeTimers();
    try {
      const terminate = vi.fn(); let loads = 0;
      const client = createD2Client(async () => (++loads === 1 ? { compile: () => new Promise(() => {}), worker: { terminate } } : { compile: async () => ({ inputPath: 'recovered' }) }) as unknown as D2, 100);
      const first = client.compile('first').catch(error => error.message);
      const second = client.compile('second');
      await vi.advanceTimersByTimeAsync(101);
      expect(await first).toContain('too long');
      expect((await second).inputPath).toBe('recovered');
      expect(terminate).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
});
