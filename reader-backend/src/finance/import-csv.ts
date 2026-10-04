import { z } from 'zod';
import { formatMoney, readCsv } from '@reader/finance-core';
import { amount, FinanceError, importRowSchema, importSchema, parse } from './contract';
import { hash } from './context';

export const csvImportSchema = importSchema.omit({ rows: true, fileHash: true }).extend({
  csv: z.string().min(1).max(2000000), separator: z.enum([',', ';', '\t']).default(','),
  mapping: z.object({ date: z.string().min(1), description: z.string().min(1), amount: z.string().optional(), credit: z.string().optional(), debit: z.string().optional(), externalId: z.string().optional(), merchant: z.string().optional(), paymentMethod: z.string().optional(), bankReference: z.string().optional(), dateFormat: z.enum(['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY']).default('YYYY-MM-DD'), stripGrouping: z.boolean().default(false) }).strict(),
}).strict();

export function csvToImport(input: unknown, scale: number) {
  const value = parse(csvImportSchema, input);
  let csv: ReturnType<typeof readCsv>;
  try { csv = readCsv(value.csv, value.separator); }
  catch (error) { throw new FinanceError(422, (error as Error).message); }
  const m = value.mapping;
  if (m.amount ? m.credit || m.debit : !m.credit || !m.debit) throw new FinanceError(422, 'Choose one signed amount column, or both credit and debit columns.');
  for (const key of ['date', 'description', 'amount', 'credit', 'debit', 'externalId', 'merchant', 'paymentMethod', 'bankReference'] as const) if (m[key] && !csv.headers.includes(m[key]!)) throw new FinanceError(422, `Column not found: ${m[key]}`);
  const rows = csv.rows.map((row, index) => {
    const fields = Object.fromEntries(csv.headers.map((header, i) => [header, row[i]]));
    const get = (key: string | undefined) => key ? fields[key].trim() : undefined;
    const number = (text: string) => {
      if (m.stripGrouping && text.includes(',') && !/^-?(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/.test(text)) throw new FinanceError(422, 'Check the amount’s thousands separators.');
      return amount(m.stripGrouping ? text.replace(/,/g, '') : text, scale);
    };
    try {
      let money: bigint;
      if (m.amount) money = number(get(m.amount)!);
      else {
        const credit = number(get(m.credit) || '0'), debit = number(get(m.debit) || '0');
        if (credit < 0n || debit < 0n || credit && debit) throw new FinanceError(422, 'Each row needs either a nonnegative credit or debit, not both.');
        money = credit - debit;
      }
      if (money === 0n) throw new FinanceError(422, 'The statement amount can’t be zero.');
      const rawDate = get(m.date)!;
      let date = rawDate;
      if (m.dateFormat !== 'YYYY-MM-DD') {
        const separator = m.dateFormat === 'DD-MM-YYYY' ? '-' : '/';
        const pattern = m.dateFormat === 'DD-MM-YYYY' ? /^\d{2}-\d{2}-\d{4}$/ : /^\d{2}\/\d{2}\/\d{4}$/;
        if (!pattern.test(rawDate)) throw new FinanceError(422, `Enter the date in ${m.dateFormat} format.`);
        const [d, month, year] = rawDate.split(separator); date = `${year}-${month}-${d}`;
      }
      return parse(importRowSchema, { date, amount: formatMoney(money, scale), description: get(m.description)!, externalId: get(m.externalId) || null, merchant: get(m.merchant) || null, paymentMethod: get(m.paymentMethod) || null, bankReference: get(m.bankReference) || null, sourceLocator: `CSV data row ${index + 1}`, sourceFields: fields });
    } catch (error) { throw new FinanceError(422, `CSV data row ${index + 1}: ${(error as Error).message}`); }
  });
  const { csv: _text, separator: _separator, mapping: _mapping, ...metadata } = value;
  return parse(importSchema, { ...metadata, fileHash: hash({ csv: value.csv }), rows });
}
