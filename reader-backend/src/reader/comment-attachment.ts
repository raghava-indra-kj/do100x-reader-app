import { z } from 'zod';
import { validateAnchor } from '@reader/md-ast';
import { pageDocument, PageContentError, jsonValue } from '../page-content';

export const commentAnchorSchema = z.object({
  version: z.literal(1), kind: z.enum(['text', 'blocks']),
  segments: z.array(z.object({ blockId: z.string().min(1).max(256), start: z.number().int().nonnegative(), end: z.number().int().positive() }).strict()).min(1).max(1000),
  quote: z.string().max(100_000), status: z.literal('attached'),
}).strict();
export type CommentAttachmentInput = { anchor?: unknown; contentVersion?: number };

export function validatedCommentAttachment(page: Parameters<typeof pageDocument>[0], target: CommentAttachmentInput = {}) {
  if (target.anchor === undefined) return {};
  if (target.contentVersion !== page.contentVersion) throw new PageContentError(409, 'The page changed while you were writing. Your comment is kept; select its source again.');
  const parsed = commentAnchorSchema.safeParse(target.anchor);
  if (!parsed.success) throw new PageContentError(400, 'Select a valid passage or block for this comment.');
  try {
    const anchor = validateAnchor(pageDocument(page), parsed.data);
    return { anchor: jsonValue(anchor), anchorRevision: page.contentVersion };
  } catch (error) {
    if (error instanceof PageContentError) throw error;
    throw new PageContentError(409, 'This selection no longer matches the page. Select its source again.');
  }
}
