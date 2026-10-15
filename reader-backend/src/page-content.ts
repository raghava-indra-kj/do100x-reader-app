import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { createDocument, documentFromMetadata, documentMetadata, replaceAnnotatedSource, locateSections, replaceSectionBody, validateAnchor, type AnnotationAnchor, type SectionBodyTarget } from '@reader/md-ast';

export class PageContentError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export function contentHash(content: string): string { return createHash('sha256').update(content, 'utf8').digest('hex'); }
export type PageContentStorage = PrismaClient | Prisma.TransactionClient;
type PageSnapshot = { id: string; content: string | null; contentVersion: number; documentMetadata?: unknown };

/** Legacy pages get repeatable identities without a write-on-read migration. */
export function pageDocument(page: PageSnapshot) {
  const source = page.content ?? '';
  if (page.documentMetadata != null) {
    try { return documentFromMetadata(source, page.documentMetadata); }
    catch { throw new PageContentError(409, 'This page’s document index does not match its content. Restore a consistent revision before editing.'); }
  }
  let index = 0;
  const seed = `${page.id}:${page.contentVersion}:${contentHash(source)}`;
  return createDocument(source, { generateId: () => `b_${contentHash(`${seed}:${index++}`).slice(0, 40)}` });
}
export function pageDocumentMetadata(page: PageSnapshot) { return documentMetadata(pageDocument(page)); }
export const jsonValue = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

export interface PageMetadataChanges {
  title?: string;
  category?: string | null;
  meaningSystemPrompt?: string | null;
  explanationSystemPrompt?: string | null;
  doubtSystemPrompt?: string | null;
}
export interface SectionEditRequest {
  contentVersion: number;
  target: SectionBodyTarget;
  expectedBodyHash: string;
  newBody: string;
}

function transaction<T>(db: PageContentStorage, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return '$transaction' in db ? db.$transaction(work, { timeout: 15_000 }) : work(db);
}
async function lockedPage(tx: Prisma.TransactionClient, userId: string, pageId: string, version: number) {
  await tx.$queryRaw`SELECT id FROM page WHERE id = ${pageId} AND userId = ${userId} FOR UPDATE`;
  const page = await tx.page.findFirst({ where: { id: pageId, userId, deletedAt: null } });
  if (!page) throw new PageContentError(404, 'This page is unavailable or you don’t have permission to edit it.');
  if (!Number.isSafeInteger(version) || version < 0 || page.contentVersion !== version) throw new PageContentError(409, 'This page has changed. Your draft is kept here. Copy it before reloading.');
  return page;
}

async function saveLocked(tx: Prisma.TransactionClient, page: Awaited<ReturnType<typeof lockedPage>>, content: string, changes: PageMetadataChanges = {}) {
  const document = pageDocument(page);
  const changed = document.source !== content;
  // All users' private attachments must move, but their bodies never leave this service.
  const comments = changed ? await tx.comment.findMany({ where: { pageId: page.id }, select: { id: true, anchor: true, anchorRevision: true } }) : [];
  const attached = comments.filter(comment => comment.anchor != null);
  const anchors: AnnotationAnchor[] = attached.map(comment => {
    if (comment.anchorRevision !== page.contentVersion) throw new PageContentError(409, 'A comment attachment belongs to another page revision. Restore a consistent revision before editing.');
    try { return validateAnchor(document, comment.anchor); }
    catch { throw new PageContentError(409, 'A saved comment attachment is invalid. Reattach it before editing this page.'); }
  });
  const next = replaceAnnotatedSource(document, content, anchors);
  const metadata = documentMetadata(next.document);
  const contentVersion = page.contentVersion + (changed ? 1 : 0);
  if (changed || Object.keys(changes).length) {
    const saved = await tx.page.updateMany({
      where: { id: page.id, userId: page.userId, deletedAt: null, contentVersion: page.contentVersion },
      data: { ...changes, ...(changed ? { content, contentVersion: { increment: 1 } } : {}), documentMetadata: jsonValue(metadata), updatedAt: new Date() },
    });
    if (saved.count !== 1) throw new PageContentError(409, 'This page changed before the save finished. Your draft is kept here.');
    for (let i = 0; i < attached.length; i++) {
      // updateMany permits a concurrent explicit deletion without resurrecting a note.
      await tx.comment.updateMany({ where: { id: attached[i].id, pageId: page.id }, data: { anchor: jsonValue(next.anchors[i]), anchorRevision: contentVersion } });
    }
  }
  return { ...page, ...changes, content, contentVersion, documentMetadata: metadata };
}

/** Every HTTP/MCP source writer uses this atomic content + identity + attachment save. */
export function savePageContent(db: PageContentStorage, userId: string, pageId: string, contentVersion: number, content: string, changes: PageMetadataChanges = {}) {
  return transaction(db, async tx => saveLocked(tx, await lockedPage(tx, userId, pageId, contentVersion), content, changes));
}

export function editSectionBody(db: PageContentStorage, userId: string, pageId: string, edit: SectionEditRequest) {
  return transaction(db, async tx => {
    const page = await lockedPage(tx, userId, pageId, edit.contentVersion);
    const source = page.content ?? '';
    const range = locateSections(source).find(section => section.kind === edit.target.kind && section.headingStart === edit.target.headingStart && section.bodyStart === edit.target.bodyStart);
    if (!range || contentHash(source.slice(range.bodyStart, range.bodyEnd)) !== edit.expectedBodyHash) throw new PageContentError(409, 'This section has changed. Reload before editing.');
    let content: string;
    try { content = replaceSectionBody({ source, target: edit.target, newBody: edit.newBody }); }
    catch (error) { throw new PageContentError(422, error instanceof Error ? error.message : 'Check the section changes and try again.'); }
    const saved = await saveLocked(tx, page, content);
    return { content: saved.content, contentVersion: saved.contentVersion, documentMetadata: saved.documentMetadata };
  });
}
