import { describe, expect, it, vi } from 'vitest';
import { refreshSources } from './source-refresh';

describe('independent subscribed calendar refresh', () => {
  it('refreshes healthy calendars after transport and feed failures', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('Removed in another tab'))
      .mockResolvedValueOnce({ error: 'Remote feed unavailable' }).mockResolvedValueOnce({ error: null });
    expect(await refreshSources(['removed', 'offline', 'healthy'], refresh, () => false)).toBe(2);
    expect(refresh.mock.calls.map(([id]) => id)).toEqual(['removed', 'offline', 'healthy']);
  });
  it('does not issue further requests after the Calendar view closes', async () => {
    let stopped = false;
    const refresh = vi.fn(async () => { stopped = true; return { error: null }; });
    expect(await refreshSources(['first', 'second'], refresh, () => stopped)).toBe(0);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
