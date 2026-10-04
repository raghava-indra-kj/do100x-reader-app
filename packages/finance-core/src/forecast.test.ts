import { expect, it } from 'vitest';
import { cashForecast, spreadMinor } from './forecast';

it('forecasts ranges, overdue obligations and account transfers without counting debt as cash', () => {
  const result = cashForecast([{ id: 'bank', isLiquid: true, balanceMinor: 1000n }, { id: 'card', isLiquid: false, balanceMinor: -500n }], [
    { date: '2026-09-29', source: 'PLAN', title: 'Overdue bill', movements: [{ accountId: 'bank', lowMinor: -400n, expectedMinor: -300n, highMinor: -200n }] },
    { date: '2026-10-02', source: 'PLAN', title: 'Repayment', movements: [{ accountId: 'bank', lowMinor: -500n, expectedMinor: -500n, highMinor: -500n }, { accountId: 'card', lowMinor: 500n, expectedMinor: 500n, highMinor: 500n }] },
    { date: '2026-10-03', source: 'ESTIMATE', title: 'Food', movements: [{ accountId: 'bank', lowMinor: -300n, expectedMinor: -250n, highMinor: -200n }] },
  ], '2026-10-01', '2026-10-03');
  expect(result.timeline[0]).toMatchObject({ lowMinor: 600n, expectedMinor: 700n, highMinor: 800n });
  expect(result.timeline[0].events[0].overdue).toBe(true);
  expect(result.timeline[1].accounts[1].expectedMinor).toBe(0n);
  expect(result.firstNegativeExpectedDate).toBe('2026-10-03');
  expect(result.timeline[2]).toMatchObject({ lowMinor: -200n, expectedMinor: -50n, highMinor: 100n });
});
it('spreads exact minor units without losing remainders', () => {
  expect(spreadMinor(100n, 3)).toEqual([34n, 33n, 33n]);
  expect(spreadMinor(0n, 2)).toEqual([0n, 0n]);
  expect(() => spreadMinor(-1n, 2)).toThrow();
});
it('does not invent spending when a ranged transfer stays between liquid accounts', () => {
  const result = cashForecast([{ id: 'a', isLiquid: true, balanceMinor: 1000n }, { id: 'b', isLiquid: true, balanceMinor: 0n }], [{ date: '2026-10-01', source: 'PLAN', title: 'Move cash', cash: { lowMinor: 0n, expectedMinor: 0n, highMinor: 0n }, movements: [
    { accountId: 'a', lowMinor: -300n, expectedMinor: -200n, highMinor: -100n },
    { accountId: 'b', lowMinor: 100n, expectedMinor: 200n, highMinor: 300n },
  ] }], '2026-10-01', '2026-10-01');
  expect(result.timeline[0]).toMatchObject({ lowMinor: 1000n, expectedMinor: 1000n, highMinor: 1000n });
});
it('rejects reversed or unbounded ranges, unknown accounts and inverted scenarios', () => {
  expect(() => cashForecast([], [], '2026-10-02', '2026-10-01')).toThrow();
  expect(() => cashForecast([], [], '2026-10-01', '2030-10-01')).toThrow();
  expect(() => cashForecast([], [{ date: '2026-10-01', title: 'X', source: 'KNOWN', movements: [{ accountId: 'unknown', lowMinor: 1n, expectedMinor: 1n, highMinor: 1n }] }], '2026-10-01', '2026-10-01')).toThrow();
  expect(() => cashForecast([{ id: 'bank', isLiquid: true, balanceMinor: 0n }], [{ date: '2026-10-01', title: 'X', source: 'KNOWN', movements: [{ accountId: 'bank', lowMinor: 2n, expectedMinor: 1n, highMinor: 1n }] }], '2026-10-01', '2026-10-01')).toThrow();
});
