/** Strict, bounded CSV reader. No guessing separators, dates or decimal precision. */
export function readCsv(text: string, separator = ','): { headers: string[]; rows: string[][] } {
  if (![',', ';', '\t'].includes(separator)) throw new Error('Choose a comma, semicolon or tab separator.');
  if (text.length > 2000000) throw new Error('The CSV must be 2 MB or smaller. Split it into separate imports.');
  text = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closedQuote = false;
  const pushField = () => { row.push(field); field = ''; closedQuote = false; if (row.length > 100) throw new Error('The CSV can have up to 100 columns.'); };
  const pushRow = () => { pushField(); if (row.some(value => value.length)) records.push(row); row = []; if (records.length > 1001) throw new Error('Import up to 1,000 statement rows at a time.'); };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else field += char;
    } else if (char === separator) pushField();
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[index + 1] === '\n') index++; pushRow(); }
    else if (char === '"') { if (field || closedQuote) throw new Error('A CSV field has an unexpected quotation mark.'); quoted = true; }
    else { if (closedQuote) throw new Error('A quoted CSV field has extra characters after it.'); field += char; }
  }
  if (quoted) throw new Error('A quoted CSV field is missing its closing quote.');
  if (field || row.length || closedQuote) pushRow();
  if (records.length < 2) throw new Error('The CSV needs a header and at least one transaction row.');
  const headers = records.shift()!.map(value => value.trim());
  if (headers.some(header => !header || header.length > 100) || new Set(headers).size !== headers.length) throw new Error('Every CSV column needs a unique, nonempty header.');
  if (records.some(row => row.length !== headers.length)) throw new Error('Each CSV row must have the same number of fields as the header.');
  return { headers, rows: records };
}

/** Spreadsheet formula prefixes are escaped on export, not persisted to data. */
export function writeCsv(headers: string[], rows: (string | null)[][]): string {
  const cell = (value: string | null) => {
    const text = value ?? '';
    const safe = /^[\s]*[=+@-]/.test(text) && !/^-?\d+(?:\.\d+)?$/.test(text) ? `'${text}` : text;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
