import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { registerPrompt, registerTool } from './register-tool';

describe('MCP Zod compatibility boundary', () => {
  const server = new McpServer({ name: 'schema-test', version: '1' });
  const client = new Client({ name: 'schema-client', version: '1' });
  const handler = vi.fn();
  beforeAll(async () => {
    registerTool(server, 'example', 'Typed test tool', { name: z.string().min(1), count: z.number().int().min(1).default(2), mode: z.enum(['first', 'second']).optional(), rows: z.array(z.object({ id: z.string().uuid() })).optional() }, input => {
      handler(input); return { content: [{ type: 'text', text: JSON.stringify(input) }] };
    });
    registerPrompt(server, 'example_prompt', 'Typed test prompt', { name: z.string(), style: z.string().optional() }, input => ({ messages: [{ role: 'user', content: { type: 'text', text: `${input.name}:${input.style ?? 'plain'}` } }] }));
    const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a); await client.connect(b);
  });
  afterAll(async () => { await client.close(); await server.close(); });
  it('advertises the complete schema and retains defaults and nested validation', async () => {
    const listed = await client.listTools();
    expect(listed.tools[0].inputSchema).toMatchObject({ type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1 }, count: { type: 'integer', minimum: 1, default: 2 }, mode: { enum: ['first', 'second'] }, rows: { type: 'array', items: { type: 'object', properties: { id: { format: 'uuid' } } } } } });
    const result = await client.callTool({ name: 'example', arguments: { name: 'Read' } });
    expect(result.isError).not.toBe(true); expect(handler).toHaveBeenLastCalledWith({ name: 'Read', count: 2 });
    const before = handler.mock.calls.length;
    for (const input of [{ name: '' }, { name: 'Read', count: 0 }, { name: 'Read', rows: [{ id: 'wrong' }] }]) expect((await client.callTool({ name: 'example', arguments: input })).isError).toBe(true);
    expect(handler).toHaveBeenCalledTimes(before);
  });
  it('keeps prompt descriptions, required arguments and handler output', async () => {
    expect((await client.listPrompts()).prompts[0]).toMatchObject({ name: 'example_prompt', description: 'Typed test prompt', arguments: [{ name: 'name', required: true }, { name: 'style', required: false }] });
    expect((await client.getPrompt({ name: 'example_prompt', arguments: { name: 'Read' } })).messages[0].content).toEqual({ type: 'text', text: 'Read:plain' });
    await expect(client.getPrompt({ name: 'example_prompt', arguments: {} })).rejects.toThrow();
  });
});
