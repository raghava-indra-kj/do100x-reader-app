import type { page } from "@prisma/client";

// Maps a page row to the list/summary response shape.
export const toPageListDto = (p: page) => ({
  id: p.id,
  userId: p.userId,
  parentPageId: p.parentId,
  title: p.title,
  category: p.category ?? null,
  isPublic: p.isPublic,
  sortOrder: p.sortOrder,
  childrenCount: p.childrenCount,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

// Maps a page row to the full response shape (includes parsed content).
export const toPageDto = (p: page) => ({ ...toPageListDto(p), content: p.content ?? null });

// Maps a trashed page row, exposing deletedAt for the trash view.
export const toTrashDto = (p: page) => ({ ...toPageListDto(p), deletedAt: p.deletedAt });
