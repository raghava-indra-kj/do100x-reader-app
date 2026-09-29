import { createHash } from "node:crypto";
import { locateSections, replaceSectionBody, type SectionBodyTarget } from "@reader/md-ast";

export class PageContentError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export interface SectionEditRequest {
  contentVersion: number;
  target: SectionBodyTarget;
  expectedBodyHash: string;
  newBody: string;
}

// Storage is injected so HTTP, MCP, and tests all use the same atomic write contract.
export interface PageContentStorage {
  page: {
    findFirst(args: { where: { id: string; userId: string; deletedAt: null } }): Promise<{ content: string | null; contentVersion: number } | null>;
    updateMany(args: {
      where: { id: string; userId: string; deletedAt: null; contentVersion: number };
      data: { content: string; contentVersion: { increment: number }; updatedAt: Date };
    }): Promise<{ count: number }>;
  };
}

export async function editSectionBody(storage: PageContentStorage, userId: string, pageId: string, edit: SectionEditRequest) {
  const page = await storage.page.findFirst({ where: { id: pageId, userId, deletedAt: null } });
  if (!page) throw new PageContentError(404, "Page not found or you do not own it");
  if (page.contentVersion !== edit.contentVersion) throw new PageContentError(409, "This page changed while you were editing. Your draft is preserved; reload before applying it.");
  const source = page.content ?? "";
  const range = locateSections(source).find((section) => section.kind === edit.target.kind && section.headingStart === edit.target.headingStart && section.bodyStart === edit.target.bodyStart);
  if (!range || contentHash(source.slice(range.bodyStart, range.bodyEnd)) !== edit.expectedBodyHash) {
    throw new PageContentError(409, "The selected section no longer matches your edit");
  }
  let content: string;
  try { content = replaceSectionBody({ source, target: edit.target, newBody: edit.newBody }); }
  catch (error) { throw new PageContentError(422, error instanceof Error ? error.message : "Invalid section edit"); }
  if (content === source) return { content, contentVersion: page.contentVersion };
  const updated = await storage.page.updateMany({
    where: { id: pageId, userId, deletedAt: null, contentVersion: edit.contentVersion },
    data: { content, contentVersion: { increment: 1 }, updatedAt: new Date() },
  });
  if (updated.count !== 1) throw new PageContentError(409, "This page changed before your save finished. Your draft is preserved.");
  return { content, contentVersion: edit.contentVersion + 1 };
}
