import type { comment } from "@prisma/client";

// Maps a comment row to the API response shape.
export const toCommentDto = (c: comment) => ({
  id: c.id,
  pageId: c.pageId,
  userId: c.userId,
  body: c.body,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});
