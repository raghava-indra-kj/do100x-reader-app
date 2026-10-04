import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { expect, it } from 'vitest';
import { attachSession, issueSession } from '../session';
import { registerFinanceTools } from '../mcp/tools/finance';
import { createFinanceRouter } from './finance-router';

it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('Finance HTTP and the existing MCP share persistence without granting public Finance access', async () => {
  const db = new PrismaClient();
  const rollback = new Error('Finance adapter fixture rollback');
  try {
    await db.$transaction(async tx => {
      const owner = await tx.appuser.create({ data: { email: `finance-${randomUUID()}@example.com`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } });
      const stranger = await tx.appuser.create({ data: { email: `finance-${randomUUID()}@example.com`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } });
      const mcp = new McpServer({ name: 'finance-test', version: '1' });
      registerFinanceTools(mcp, owner.id, tx);
      const client = new Client({ name: 'finance-test-client', version: '1' });
      const [a, b] = InMemoryTransport.createLinkedPair();
      await mcp.connect(a); await client.connect(b);
      const tool = async (name: string, args: Record<string, unknown> = {}) => {
        const response = await client.callTool({ name, arguments: args });
        if (response.isError) throw new Error(JSON.stringify(response.content));
        return JSON.parse((response.content as { text: string }[])[0].text);
      };
      const app = express(); app.use(express.json()); app.use(attachSession(tx));
      app.get('/login/:id', (req, res) => { issueSession(res, req.params.id as string); res.json({ ok: true }); });
      app.use('/finance', createFinanceRouter(tx));
      const http = app.listen(0);
      try {
        const address = http.address();
        if (!address || typeof address === 'string') throw new Error('No test port');
        const base = `http://127.0.0.1:${address.port}`;
        const cookie = async (id: string) => (await fetch(`${base}/login/${id}`)).headers.get('set-cookie')!.split(';')[0];
        const ownerCookie = await cookie(owner.id), otherCookie = await cookie(stranger.id);
        const request = (path: string, method = 'GET', body?: unknown, session?: string, origin = 'http://localhost:3000') => fetch(`${base}/finance${path}`, { method, headers: { Origin: origin, ...(session ? { Cookie: session } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        expect((await request('/books')).status).toBe(401);
        const book = await tool('finance_create_book', { book: { requestKey: randomUUID(), name: 'MCP personal book', timezone: 'Asia/Kolkata' } });
        expect((await tool('finance_list_books'))[0].id).toBe(book.id);
        expect((await request(`/books/${book.id}/catalog`)).status).toBe(401);
        expect((await request(`/books/${book.id}/catalog?userId=${owner.id}`, 'GET', undefined, otherCookie)).status).toBe(404);
        const catalog = await (await request(`/books/${book.id}/catalog`, 'GET', undefined, ownerCookie)).json();
        expect(catalog.book.name).toBe('MCP personal book');
        expect(catalog.categories.length).toBeGreaterThan(0);
        const accountInput = { requestKey: randomUUID(), name: 'Cash pocket', openingDate: '2026-10-01', openingAmount: '25.00' };
        expect((await request(`/books/${book.id}/accounts`, 'POST', accountInput, ownerCookie, 'https://untrusted.example')).status).toBe(403);
        expect((await request(`/books/${book.id}/accounts`, 'POST', { ...accountInput, userId: stranger.id }, ownerCookie)).status).toBe(422);
        const accountResponse = await request(`/books/${book.id}/accounts`, 'POST', accountInput, ownerCookie);
        expect(accountResponse.status).toBe(201);
        const account = await accountResponse.json();
        expect((await tool('finance_get_catalog', { bookId: book.id })).accounts[0].id).toBe(account.id);
        const expense = await tool('finance_create_transaction', { bookId: book.id, transaction: { requestKey: randomUUID(), kind: 'EXPENSE', date: '2026-10-02', description: 'Tea', movements: [{ accountId: account.id, amount: '-5.00' }] } });
        expect((await (await request(`/books/${book.id}/transactions/${expense.id}`, 'GET', undefined, ownerCookie)).json()).movements[0].amountMinor).toBe('-500');
        expect((await tool('finance_get_balances', { bookId: book.id }))[0].postedMinor).toBe('2000');
        const plan = await tool('finance_create_schedule', { bookId: book.id, schedule: { requestKey: randomUUID(), title: 'Upcoming bill', kind: 'EXPENSE', accountId: account.id, frequency: 'MONTHLY', startDate: '2026-10-31', low: '1.00', expected: '2.00', high: '3.00' } });
        const occurrenceRead = await request(`/books/${book.id}/occurrences?from=2026-10-01&to=2026-12-31`, 'GET', undefined, ownerCookie);
        expect(occurrenceRead.status).toBe(200);
        expect((await occurrenceRead.json())[0].scheduleId).toBe(plan.id);
        const csvBatch = await tool('finance_stage_csv_import', { bookId: book.id, statement: { requestKey: randomUUID(), accountId: account.id, sourceName: 'MCP CSV', csv: 'Date,Description,Amount\n2026-10-03,CSV Tea,-1.00', mapping: { date: 'Date', description: 'Description', amount: 'Amount' } } });
        expect((await request(`/books/${book.id}/imports/${csvBatch.id}`, 'GET', undefined, ownerCookie)).status).toBe(200);
        expect((await request(`/books/${book.id}/imports/${csvBatch.id}/commit`, 'POST', { expectedVersion: 1, acceptUnverified: true }, ownerCookie)).status).toBe(200);
        expect((await tool('finance_get_import', { bookId: book.id, importId: csvBatch.id })).status).toBe('COMMITTED');
        const tools = await client.listTools();
        expect(tools.tools.filter(item => item.name.startsWith('finance_'))).toHaveLength(41);
        const createTool = tools.tools.find(item => item.name === 'finance_create_transaction')!;
        expect(JSON.stringify(createTool.inputSchema)).toContain('movements');
        const wrongBook = await tx.finance_book.create({ data: { userId: stranger.id, name: 'Not yours', currency: 'INR', currencyScale: 2, timezone: 'Asia/Kolkata', requestKey: randomUUID(), requestHash: 'a'.repeat(64) } });
        const denied = await client.callTool({ name: 'finance_get_catalog', arguments: { bookId: wrongBook.id } });
        expect(denied.isError).toBe(true);
        expect(JSON.stringify(denied.content)).toContain('404');
        const deletion = await request(`/books/${book.id}/transactions/${expense.id}/deletion`, 'PATCH', { expectedVersion: 1, deleted: true }, ownerCookie);
        expect(deletion.status).toBe(200);
        expect((await tool('finance_list_transactions', { bookId: book.id, query: { deleted: true } })).items[0].id).toBe(expense.id);
        const history = await tool('finance_list_changes', { bookId: book.id });
        expect(history.items.some((item: any) => item.source === 'MCP')).toBe(true);
        expect(history.items.some((item: any) => item.source === 'HTTP')).toBe(true);
      } finally {
        await new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
        await client.close(); await mcp.close();
      }
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
}, 70000);
