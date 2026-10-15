import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { HabitError } from '../../habits/habit-service';
import { CalendarError } from '../../calendar/calendar-service';
import { CaptureError } from '../../reader/captures';
import { TaskHierarchyError } from '../../task-errors';

export async function featureResult(work: () => Promise<unknown>) {
  try { return { content: [{ type: 'text' as const, text: JSON.stringify(await work()) }] }; }
  catch (error) {
    let status = 500, message = 'Couldn’t complete this operation. Please try again.';
    if (error instanceof HabitError || error instanceof CalendarError || error instanceof CaptureError || error instanceof TaskHierarchyError) {
      status = error.status; message = error.message;
    } else if (error instanceof z.ZodError) {
      status = 400; message = error.issues[0]?.message ?? 'Check the supplied values.';
    } else {
      const code = (error as { code?: string } | null)?.code;
      if (code === 'P2021' || code === 'P2022') { status = 503; message = 'This feature needs its database update installed with the app release. No migration was run by this tool.'; }
      if (code === 'P2002' || code === 'P2034') { status = 409; message = 'Another change was saved at the same time. Refresh and try again.'; }
      if (code === 'P2025') { status = 409; message = 'This record changed or is no longer available. Refresh before retrying.'; }
    }
    // Never send ORM diagnostics, connection strings, or stack traces to clients.
    return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ status, message }) }] };
  }
}

export const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
export const createOnce = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/** Preserve strict, shared Zod contracts without expanding the SDK's duplicate Zod type graph. */
export function registerFeatureTool<S extends z.ZodRawShape>(server: McpServer, name: string, description: string, shape: S, work: (input: z.output<z.ZodObject<S>>) => Promise<unknown>, annotations: ToolAnnotations = {}) {
  const schema = z.object(shape).strict();
  server.registerTool<AnySchema, AnySchema>(name, {
    description, inputSchema: schema as unknown as AnySchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false, ...annotations },
  }, (input: unknown) => featureResult(() => work(schema.parse(input))));
}
