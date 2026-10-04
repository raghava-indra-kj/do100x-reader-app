import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { csvToImport } from './import-csv';
const input = () => ({ requestKey: randomUUID(), accountId: randomUUID(), sourceName: 'Bank CSV', csv: 'Date,Description,Credit,Debit\n01/10/2026,Salary,"1,00,000.00",\n02/10/2026,Tea,,5.00', mapping: { date: 'Date', description: 'Description', credit: 'Credit', debit: 'Debit', dateFormat: 'DD/MM/YYYY', stripGrouping: true } });
it('maps explicit date and separate credit/debit columns with exact Indian grouping', () => {
  const result = csvToImport(input(), 2);
  expect(result.rows.map(row => [row.date, row.amount])).toEqual([['2026-10-01', '100000.00'], ['2026-10-02', '-5.00']]);
  expect(result.rows[0].sourceFields?.Credit).toBe('1,00,000.00');
  expect(result.fileHash).toHaveLength(64);
});
it('does not guess invalid dates, columns, decimal precision or grouping', () => {
  const value = input();
  for (const changed of [
    { ...value, mapping: { ...value.mapping, date: 'Absent' } },
    { ...value, mapping: { ...value.mapping, amount: 'Credit' } },
    { ...value, csv: 'Date,Description,Credit,Debit\n31/02/2026,Tea,,5.00' },
    { ...value, csv: 'Date,Description,Credit,Debit\n01/10/2026,Tea,,5.001' },
    { ...value, csv: 'Date,Description,Credit,Debit\n01/10/2026,Tea,"1,2,3",' },
    { ...value, csv: 'Date,Description,Credit,Debit\n01/10/2026,Tea,10.00,5.00' },
  ]) expect(() => csvToImport(changed, 2)).toThrow();
});
