import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CallToolResult, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

/**
 * Infer handler input with the backend's Zod version. The SDK also imports Zod 4;
 * comparing both complete declaration graphs at every legacy tool overload can
 * exhaust the TypeScript heap. Bridge that boundary once, with runtime parsing
 * retained on both sides and no widening of the handler's domain input.
 */
export function registerTool<S extends z.ZodRawShape>(server: McpServer, name: string, description: string, shape: S, run: (input: z.output<z.ZodObject<S>>) => CallToolResult | Promise<CallToolResult>) {
  const schema = z.object(shape);
  return server.registerTool<AnySchema, AnySchema>(name, { description, inputSchema: schema as unknown as AnySchema }, (input: unknown) => run(schema.parse(input)));
}

export function registerPrompt<S extends z.ZodRawShape>(server: McpServer, name: string, description: string, shape: S, run: (input: z.output<z.ZodObject<S>>) => GetPromptResult | Promise<GetPromptResult>) {
  const schema = z.object(shape);
  return server.registerPrompt<ZodRawShapeCompat>(name, { description, argsSchema: shape as unknown as ZodRawShapeCompat }, (input: unknown) => run(schema.parse(input)));
}
