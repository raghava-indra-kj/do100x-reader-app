import { addDays, parseDate } from './dates';

export interface ForecastMovement { accountId: string; lowMinor: bigint; expectedMinor: bigint; highMinor: bigint }
export interface ForecastEvent {
  date: string; source: 'PLAN' | 'KNOWN' | 'PENDING' | 'ESTIMATE'; title: string;
  movements: ForecastMovement[]; overdue?: boolean;
  // Correlated internal transfers need an explicit cash delta. Summing each
  // account's independent worst-case bounds would invent a transfer expense.
  cash?: { lowMinor: bigint; expectedMinor: bigint; highMinor: bigint };
}
export interface ForecastAccount { id: string; isLiquid: boolean; balanceMinor: bigint }
export interface ForecastDay {
  date: string; lowMinor: bigint; expectedMinor: bigint; highMinor: bigint;
  accounts: ForecastMovement[]; events: ForecastEvent[];
}

/** Each scenario is an assumption, not a probability/confidence interval. */
export function cashForecast(accounts: ForecastAccount[], events: ForecastEvent[], from: string, to: string) {
  parseDate(from); parseDate(to);
  if (from > to || parseDate(to).getTime() - parseDate(from).getTime() > 732 * 86400000) throw new Error('Choose a forecast period of two years or less.');
  const accountIds = new Set(accounts.map(account => account.id));
  const grouped = new Map<string, ForecastEvent[]>();
  for (const event of events) {
    parseDate(event.date);
    if (event.date > to) continue;
    const date = event.date < from ? from : event.date;
    for (const movement of event.movements) {
      if (!accountIds.has(movement.accountId)) throw new Error('A forecast entry refers to an account that wasn’t found.');
      if (movement.lowMinor > movement.expectedMinor || movement.expectedMinor > movement.highMinor) throw new Error('Check the low, expected and high forecast estimates.');
    }
    grouped.set(date, [...(grouped.get(date) ?? []), { ...event, date, overdue: event.overdue || event.date < from }]);
  }
  const balances = new Map(accounts.map(account => [account.id, { lowMinor: account.balanceMinor, expectedMinor: account.balanceMinor, highMinor: account.balanceMinor }]));
  const openingCash = accounts.filter(account => account.isLiquid).reduce((total, account) => total + account.balanceMinor, 0n);
  const total = { lowMinor: openingCash, expectedMinor: openingCash, highMinor: openingCash };
  const timeline: ForecastDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const dayEvents = grouped.get(date) ?? [];
    for (const event of dayEvents) for (const movement of event.movements) {
      const balance = balances.get(movement.accountId)!;
      balance.lowMinor += movement.lowMinor; balance.expectedMinor += movement.expectedMinor; balance.highMinor += movement.highMinor;
    }
    for (const event of dayEvents) {
      const cash = event.cash ?? event.movements.filter(movement => accounts.find(account => account.id === movement.accountId)!.isLiquid).reduce((sum, movement) => ({ lowMinor: sum.lowMinor + movement.lowMinor, expectedMinor: sum.expectedMinor + movement.expectedMinor, highMinor: sum.highMinor + movement.highMinor }), { lowMinor: 0n, expectedMinor: 0n, highMinor: 0n });
      if (cash.lowMinor > cash.expectedMinor || cash.expectedMinor > cash.highMinor) throw new Error('Check the low, expected and high cash estimates.');
      total.lowMinor += cash.lowMinor; total.expectedMinor += cash.expectedMinor; total.highMinor += cash.highMinor;
    }
    const accountBalances = accounts.map(account => {
      const value = { accountId: account.id, ...balances.get(account.id)! };
      return value;
    });
    timeline.push({ date, ...total, accounts: accountBalances, events: dayEvents });
    if (date === to) break;
  }
  return { timeline, firstNegativeExpectedDate: timeline.find(day => day.expectedMinor < 0n)?.date ?? null, firstNegativeLowDate: timeline.find(day => day.lowMinor < 0n)?.date ?? null, accountShortfalls: accounts.map(account => ({ accountId: account.id, date: timeline.find(day => day.accounts.find(a => a.accountId === account.id)!.expectedMinor < 0n)?.date ?? null })), scenarios: 'The low estimate uses lower income and higher spending; the high estimate uses higher income and lower spending. These are estimates, not guaranteed limits.' };
}

/** Integer allocation with deterministic remainder; no fractional pennies lost. */
export function spreadMinor(total: bigint, days: number): bigint[] {
  if (!Number.isSafeInteger(days) || days < 1 || total < 0n) throw new Error('Check the daily allocation.');
  const base = total / BigInt(days), remainder = total % BigInt(days);
  return Array.from({ length: days }, (_, index) => base + (BigInt(index) < remainder ? 1n : 0n));
}
