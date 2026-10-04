import { formatMoney, parseMoney } from '@reader/finance-core';
import type { TransactionFields, TransactionKind } from '@domain/finance/models/finance';

/** Decimal drafts become signed movements once, without floating-point money. */
export function simpleMovements(kind: TransactionKind, amount: string, accountId: string, destination: string, date: string, cleared: boolean, scale: number): TransactionFields['movements'] {
  const minor = parseMoney(amount, scale);
  if (kind !== 'ADJUSTMENT' && minor <= 0n) throw new Error('Amount must be greater than zero');
  const signed = kind === 'EXPENSE' || kind === 'TRANSFER' ? -minor : minor;
  const movements = [{ accountId, amount: formatMoney(signed, scale), effectiveDate: date, cleared }];
  if (kind === 'TRANSFER') movements.push({ accountId: destination, amount: formatMoney(minor, scale), effectiveDate: date, cleared });
  return movements;
}
