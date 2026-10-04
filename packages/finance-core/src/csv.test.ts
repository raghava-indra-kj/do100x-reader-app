import { expect, it } from 'vitest';
import { readCsv, writeCsv } from './csv';
it('reads BOM, quoted separators, escaped quotes and multiline cells', () => {
  expect(readCsv('\uFEFFDate,Description,Amount\r\n2026-10-01,"Tea, \"\"special\"\"\nshop",-5.00\r\n')).toEqual({ headers: ['Date', 'Description', 'Amount'], rows: [['2026-10-01', 'Tea, "special"\nshop', '-5.00']] });
});
it('accepts explicit semicolon/tab delimiters and rejects corrupt or oversized CSV', () => {
  expect(readCsv('A;B\n1;2', ';').rows).toEqual([['1', '2']]);
  for (const text of ['A,A\n1,2', 'A,B\n1', 'A,B\n"1,2', 'A,B\n"1"x,2', 'A,B\n1"2,3', 'A,\n1,2', 'x'.repeat(2000001)]) expect(() => readCsv(text)).toThrow();
});
it('exports quoted values and protects spreadsheet formula text without changing signed amounts', () => {
  const text = writeCsv(['Description', 'Amount'], [['=HYPERLINK("x")', '-5.00'], ['plain, text', '5.00']]);
  const csv = readCsv(text);
  expect(csv.rows[0]).toEqual(['\'=HYPERLINK("x")', '-5.00']);
  expect(csv.rows[1]).toEqual(['plain, text', '5.00']);
});
