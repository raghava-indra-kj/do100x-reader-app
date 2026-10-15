import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { captureInput, createCapture, discardCapture, getCapture, keepCapture, listCaptures } from '../../reader/captures';
import { createOnce, readOnly, registerFeatureTool as register } from './feature-tool';

const id = z.string().uuid();
export function registerCaptureTools(server: McpServer, userId: string, db: PrismaClient = prisma) {
  register(server, 'reader_list_captures', 'List your active temporary inbox, earliest expiry first, with source metadata and limits. Optional search matches titles or source URLs. Kept, expired and discarded captures are excluded.', { search: z.string().trim().max(200).optional() }, ({ search }) => listCaptures(db, userId, search), readOnly);
  register(server, 'reader_get_capture', 'Read an active owned capture’s Markdown, source, expiry and contentVersion. Its id is a Reader pageId: existing Reader section/edit/comment/vocabulary/quiz tools work until expiry. Use reader_update_page with contentVersion for edits; editing does not extend expiry.', { captureId: id }, ({ captureId }) => getCapture(db, userId, captureId), readOnly);
  register(server, 'reader_create_capture', 'Save provided text/Markdown in your private temporary inbox for seven days (512 KiB, 100 active captures max). Does not fetch the source URL. captureKey is a retry UUID: reusing it returns the original page without overwriting edits or extending expiry. URL credentials/query/fragment are removed.', { capture: captureInput }, ({ capture }) => createCapture(db, userId, capture), createOnce);
  register(server, 'reader_keep_capture', 'Keep an active capture permanently under an owned saved parent page. Preserves its ID, content, comments and quizzes, removes expiry and makes it appear in saved pages. A public destination can make it publicly accessible. Retrying an already-kept capture does not move it again.', { captureId: id, parentPageId: id }, ({ captureId, parentPageId }) => keepCapture(db, userId, captureId, parentPageId), { idempotentHint: true });
  register(server, 'reader_discard_capture', 'Discard a temporary capture immediately so it is inaccessible. Physical deletion follows the configured cleanup worker. Permanent and already-kept pages are protected; this does not run cleanup or change its configuration.', { captureId: id }, ({ captureId }) => discardCapture(db, userId, captureId), { idempotentHint: true });
}
