import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { z } from 'zod';
import { FinanceError } from '../../finance/contract';

export async function financeTool(run: () => Promise<unknown>) {
  try { return { content: [{ type: 'text' as const, text: JSON.stringify(await run(), null, 2) }] }; }
  catch (error) {
    if (error instanceof FinanceError) return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ status: error.status, message: error.message, details: error.details }) }] };
    throw error;
  }
}

// The existing SDK resolves Zod compatibility types from the root while the
// backend uses Zod 3 locally. Bridge only duplicate declaration graphs, not
// domain types. The SDK supports both at runtime and advertises/validates the
// full schema. The callback independently preserves strict domain inference.
export function registerFinanceTool<S extends z.ZodRawShape>(server: McpServer, name: string, description: string, shape: S, run: (input: z.output<z.ZodObject<S>>) => ReturnType<typeof financeTool>) {
  const schema = z.object(shape).strict();
  const inputSchema = schema as unknown as AnySchema;
  server.registerTool<AnySchema, AnySchema>(name, { description, inputSchema }, (input: unknown) => run(schema.parse(input)));
}
