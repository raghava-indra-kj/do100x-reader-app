/** Exact minor-unit arithmetic. JSON amounts are decimal strings, never numbers. */
export const MAX_MINOR = (1n << 63n) - 1n;

export function validateScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 0 || scale > 4) throw new Error('Currency amounts must use between 0 and 4 decimal places.');
}

export function parseMoney(value: string, scale = 2): bigint {
  validateScale(scale);
  if (typeof value !== 'string' || value.length > 32) throw new Error('Enter a decimal amount, such as 250.00.');
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match || (match[3]?.length ?? 0) > scale) throw new Error(`Use up to ${scale} decimal places, without thousands separators.`);
  const amount = BigInt(match[2]) * 10n ** BigInt(scale) + BigInt((match[3] ?? '').padEnd(scale, '0') || '0');
  if (amount > MAX_MINOR) throw new Error('This amount is too large.');
  return match[1] ? -amount : amount;
}

export function formatMoney(amount: bigint | string, scale = 2): string {
  validateScale(scale);
  const minor = typeof amount === 'bigint' ? amount : BigInt(amount);
  const absolute = minor < 0n ? -minor : minor;
  const base = 10n ** BigInt(scale);
  const whole = (absolute / base).toString();
  return `${minor < 0n ? '-' : ''}${whole}${scale ? '.' + (absolute % base).toString().padStart(scale, '0') : ''}`;
}

export function sumMoney(values: Iterable<bigint>): bigint {
  let result = 0n;
  for (const value of values) result += value;
  return result;
}

export function medianMoney(values: readonly bigint[]): bigint | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2n;
}

export function currencyScale(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Enter a three-letter currency code, such as INR.');
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}
