import { createHash, randomUUID } from "crypto";
import { prisma } from "./prisma";
import { ensurePersonalReaderSpace } from "./reader-space";

const FORMAT_VERSION = "reader-markdown-v1";

function hashMarkdown(markdown: string): string {
  return createHash("sha256").update(markdown, "utf8").digest("hex");
}

function legacyPropertyKey(key: string): { key: string; label: string; configJson?: object } {
  const clean = key.trim();
  if (/^[A-Za-z][A-Za-z0-9:_-]{0,127}$/.test(clean)) return { key: clean, label: clean };
  const stableHash = createHash("sha256").update(clean).digest("hex").slice(0, 20);
  return {
    key: `legacy-${stableHash}`,
    label: clean.slice(0, 255) || "Legacy property",
    configJson: { legacyKey: clean },
  };
}

/**
 * Idempotently moves one account from the legacy mutable page rows to
 * workspace-scoped, versioned Reader documents. Existing page IDs are retained
 * as document IDs so bookmarks, vocabulary, and links keep resolving.
 */
export async function migrateLegacyReaderDataForUser(user: {
  id: string;
  readerProfile: { homepageId: string | null } | null;
}) {
  const context = await ensurePersonalReaderSpace(user.id);
  const pages = await prisma.page.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const existingDocuments = await prisma.reader_document.findMany({
    where: { legacyPageId: { in: pages.map((page) => page.id) } },
    select: { legacyPageId: true, id: true },
  });
  const migratedPageIds = new Set(existingDocuments.map((document) => document.legacyPageId).filter(Boolean));
  const documentIdByLegacyPageId = new Map(existingDocuments
    .filter((document): document is typeof document & { legacyPageId: string } => Boolean(document.legacyPageId))
    .map((document) => [document.legacyPageId, document.id]));

  for (const page of pages) {
    if (migratedPageIds.has(page.id)) continue;
    const markdown = page.content ?? "";
    const revisionId = randomUUID();
    await prisma.reader_document.create({
      data: {
        id: page.id,
        legacyPageId: page.id,
        readerSpaceId: context.readerSpaceId,
        parentId: page.parentId,
        title: page.title,
        category: page.category,
        meaningSystemPrompt: page.meaningSystemPrompt,
        explanationSystemPrompt: page.explanationSystemPrompt,
        doubtSystemPrompt: page.doubtSystemPrompt,
        orderKey: `${String(page.sortOrder).padStart(12, "0")}-${page.id}`,
        visibility: page.isPublic ? "legacy-public" : "workspace",
        currentRevisionNumber: 1,
        headRevisionId: revisionId,
        createdById: user.id,
        updatedById: user.id,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        deletedAt: page.deletedAt,
        revisions: {
          create: {
            id: revisionId,
            revisionNumber: 1,
            markdown,
            contentHash: hashMarkdown(markdown),
            formatVersion: FORMAT_VERSION,
            createdById: user.id,
            createdAt: page.updatedAt,
          },
        },
      },
    });
    documentIdByLegacyPageId.set(page.id, page.id);
  }

  const homepageId = user.readerProfile?.homepageId;
  const migratedHomepageId = homepageId && documentIdByLegacyPageId.has(homepageId)
    ? documentIdByLegacyPageId.get(homepageId)!
    : null;
  await prisma.reader_member_preference.upsert({
    where: { readerSpaceId_userId: { readerSpaceId: context.readerSpaceId, userId: user.id } },
    update: migratedHomepageId ? { homeDocumentId: migratedHomepageId } : {},
    create: {
      readerSpaceId: context.readerSpaceId,
      userId: user.id,
      homeDocumentId: migratedHomepageId,
    },
  });
  if (migratedHomepageId && user.readerProfile) {
    await prisma.reader_profile.update({ where: { userId: user.id }, data: { homepageId: null } });
  }

  const properties = await prisma.page_property.findMany({ where: { userId: user.id } });
  for (const property of properties) {
    const documentId = documentIdByLegacyPageId.get(property.pageId);
    if (!documentId) continue;
    const definitionData = legacyPropertyKey(property.key);
    const definition = await prisma.reader_property_definition.upsert({
      where: { readerSpaceId_key: { readerSpaceId: context.readerSpaceId, key: definitionData.key } },
      update: {},
      create: {
        readerSpaceId: context.readerSpaceId,
        key: definitionData.key,
        label: definitionData.label,
        valueType: "text",
        configJson: definitionData.configJson,
      },
    });
    await prisma.reader_document_property_value.upsert({
      where: { documentId_definitionId: { documentId, definitionId: definition.id } },
      update: { valueJson: property.value },
      create: { documentId, definitionId: definition.id, valueJson: property.value },
    });
  }

  const comments = await prisma.comment.findMany({ where: { userId: user.id } });
  for (const comment of comments) {
    const documentId = documentIdByLegacyPageId.get(comment.pageId);
    if (!documentId) continue;
    const document = await prisma.reader_document.findUnique({
      where: { id: documentId },
      select: { currentRevisionNumber: true },
    });
    if (!document) continue;
    const revision = await prisma.reader_document_revision.findUnique({
      where: { documentId_revisionNumber: { documentId, revisionNumber: document.currentRevisionNumber } },
      select: { id: true, markdown: true },
    });
    if (!revision) continue;

    const selected = comment.selectedText;
    const foundAt = selected ? revision.markdown.indexOf(selected) : -1;
    const startOffset = Math.max(foundAt, 0);
    const endOffset = foundAt >= 0 ? foundAt + selected.length : 0;
    await prisma.reader_document_annotation.upsert({
      where: { legacyCommentId: comment.id },
      update: {},
      create: {
        legacyCommentId: comment.id,
        documentId,
        revisionId: revision.id,
        authorId: user.id,
        startOffset,
        endOffset,
        exactQuote: selected,
        prefix: foundAt >= 0 ? revision.markdown.slice(Math.max(0, foundAt - 64), foundAt) : null,
        suffix: foundAt >= 0 ? revision.markdown.slice(endOffset, endOffset + 64) : null,
        body: comment.body,
        sectionTitle: comment.sectionTitle,
        linkedDocumentId: comment.linkedPageId,
        isExplanation: comment.isExplanation,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      },
    });
  }

  return {
    userId: user.id,
    readerSpaceId: context.readerSpaceId,
    pages: pages.length,
    newlyMigratedPages: pages.filter((page) => !migratedPageIds.has(page.id)).length,
    properties: properties.length,
    comments: comments.length,
  };
}
