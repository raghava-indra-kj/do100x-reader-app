import { createHash, randomBytes, randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";
import { ensurePersonalReaderSpace } from "../../reader-space";
import { insertSection, parseMarkdownSectionsAst, replaceSectionBody } from "../utils/markdown-sections";
import { replaceLines } from "../utils/sectionizer";

const FORMAT_VERSION = "reader-markdown-v1";
const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function hash(markdown: string) {
  return createHash("sha256").update(markdown, "utf8").digest("hex");
}

function orderKey() {
  return `${Date.now().toString(36).padStart(10, "0")}-${randomBytes(4).toString("hex")}`;
}

async function personalSpace(userId: string) {
  return ensurePersonalReaderSpace(userId);
}

async function documentForUser(userId: string, documentId: string) {
  const space = await personalSpace(userId);
  return prisma.reader_document.findFirst({
    where: { id: documentId, readerSpaceId: space.readerSpaceId, deletedAt: null },
    include: { revisions: { where: { revisionNumber: { gt: 0 } }, orderBy: { revisionNumber: "desc" }, take: 1 } },
  });
}

async function commitMarkdown(userId: string, documentId: string, baseRevision: number, markdown: string, metadata: { title?: string; category?: string | null } = {}) {
  if (Buffer.byteLength(markdown, "utf8") > MAX_MARKDOWN_BYTES || markdown.includes("\0")) {
    return { kind: "invalid" as const, message: "Markdown is invalid or exceeds the 5 MB Reader limit" };
  }
  const space = await personalSpace(userId);
  return prisma.$transaction(async (tx) => {
    const current = await tx.reader_document.findFirst({
      where: { id: documentId, readerSpaceId: space.readerSpaceId, deletedAt: null },
      select: { currentRevisionNumber: true, headRevisionId: true },
    });
    if (!current) return { kind: "missing" as const };
    if (current.currentRevisionNumber !== baseRevision) return { kind: "conflict" as const, revision: current.currentRevisionNumber };
    const revisionId = randomUUID();
    const nextRevision = baseRevision + 1;
    const update = await tx.reader_document.updateMany({
      where: { id: documentId, currentRevisionNumber: baseRevision, deletedAt: null },
      data: {
        currentRevisionNumber: nextRevision,
        headRevisionId: revisionId,
        updatedById: userId,
        ...(metadata.title === undefined ? {} : { title: metadata.title }),
        ...(metadata.category === undefined ? {} : { category: metadata.category }),
      },
    });
    if (update.count !== 1) return { kind: "conflict" as const, revision: null };
    await tx.reader_document_revision.create({
      data: { id: revisionId, documentId, revisionNumber: nextRevision, parentRevisionId: current.headRevisionId, markdown, contentHash: hash(markdown), formatVersion: FORMAT_VERSION, createdById: userId },
    });
    return { kind: "updated" as const, revision: nextRevision };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function registerDocumentTools(server: McpServer, userId: string) {
  server.tool("reader_list_pages", "List versioned Reader documents in your personal workspace.", {
    parentPageId: z.string().optional(), category: z.string().optional(), search: z.string().optional(),
  }, async ({ parentPageId, category, search }) => {
    const space = await personalSpace(userId);
    const documents = await prisma.reader_document.findMany({
      where: { readerSpaceId: space.readerSpaceId, deletedAt: null, ...(parentPageId === undefined ? {} : { parentId: parentPageId === "null" ? null : parentPageId }), ...(category ? { category } : {}), ...(search?.trim() ? { title: { contains: search.trim() } } : {}) },
      orderBy: [{ orderKey: "asc" }, { createdAt: "asc" }],
      select: { id: true, parentId: true, title: true, category: true, currentRevisionNumber: true, createdAt: true, updatedAt: true },
    });
    return text(documents.map((document) => ({ ...document, pageId: document.id, parentPageId: document.parentId, revisionNumber: document.currentRevisionNumber })));
  });

  server.tool("reader_get_page", "Read a Reader document's canonical Markdown and current revision number before editing.", {
    pageId: z.string(), includeLineNumbers: z.boolean().optional().default(false),
  }, async ({ pageId, includeLineNumbers }) => {
    const document = await documentForUser(userId, pageId);
    if (!document || document.revisions.length === 0) return failure(`Document not found: ${pageId}`);
    const revision = document.revisions[0];
    const markdown = includeLineNumbers ? revision.markdown.split(/\r?\n/).map((line, index) => `${index + 1}: ${line}`).join("\n") : revision.markdown;
    return text({ id: document.id, pageId: document.id, parentPageId: document.parentId, title: document.title, category: document.category, markdown, content: markdown, revisionNumber: revision.revisionNumber, baseRevision: revision.revisionNumber, createdAt: document.createdAt, updatedAt: document.updatedAt });
  });

  server.tool("reader_create_page", "Create a versioned Markdown document in your personal Reader workspace.", {
    title: z.string().min(1).max(1000), content: z.string().optional().default(""), parentPageId: z.string().nullable().optional(), category: z.string().nullable().optional(),
  }, async ({ title, content, parentPageId, category }) => {
    if (Buffer.byteLength(content, "utf8") > MAX_MARKDOWN_BYTES || content.includes("\0")) return failure("Markdown is invalid or exceeds the 5 MB Reader limit");
    const space = await personalSpace(userId);
    const parentId = parentPageId ?? null;
    if (parentId) {
      const parent = await prisma.reader_document.findFirst({ where: { id: parentId, readerSpaceId: space.readerSpaceId, deletedAt: null }, select: { id: true } });
      if (!parent) return failure(`Parent document not found: ${parentId}`);
    }
    const id = randomUUID(); const revisionId = randomUUID();
    await prisma.reader_document.create({ data: { id, readerSpaceId: space.readerSpaceId, parentId, title: title.trim(), category: category?.trim() || null, orderKey: orderKey(), currentRevisionNumber: 1, headRevisionId: revisionId, createdById: userId, updatedById: userId, revisions: { create: { id: revisionId, revisionNumber: 1, markdown: content, contentHash: hash(content), formatVersion: FORMAT_VERSION, createdById: userId } } } });
    return text({ success: true, pageId: id, revisionNumber: 1 });
  });

  server.tool("reader_update_page", "Update Markdown or metadata. baseRevision is required to prevent overwriting another edit.", {
    pageId: z.string(), baseRevision: z.number().int().positive(), title: z.string().min(1).max(1000).optional(), content: z.string().optional(), category: z.string().nullable().optional(),
  }, async ({ pageId, baseRevision, title, content, category }) => {
    const document = await documentForUser(userId, pageId);
    if (!document || document.revisions.length === 0) return failure(`Document not found: ${pageId}`);
    if (content === undefined) {
      if (document.currentRevisionNumber !== baseRevision) return failure(`Conflict: current revision is ${document.currentRevisionNumber}; re-read the document before updating metadata.`);
      await prisma.reader_document.update({ where: { id: pageId }, data: { ...(title === undefined ? {} : { title: title.trim() }), ...(category === undefined ? {} : { category: category?.trim() || null }), updatedById: userId } });
      return text({ success: true, pageId, revisionNumber: baseRevision, metadataOnly: true });
    }
    const result = await commitMarkdown(userId, pageId, baseRevision, content, { ...(title === undefined ? {} : { title: title.trim() }), ...(category === undefined ? {} : { category: category?.trim() || null }) });
    if (result.kind === "updated") return text({ success: true, pageId, revisionNumber: result.revision });
    if (result.kind === "conflict") return failure(`Conflict: current revision is ${result.revision ?? "newer"}; re-read the document before retrying.`);
    return failure(result.kind === "missing" ? `Document not found: ${pageId}` : result.message);
  });

  server.tool("reader_delete_page", "Soft-delete an empty-leaf Reader document. Child documents must be moved or deleted first.", { pageId: z.string() }, async ({ pageId }) => {
    const document = await documentForUser(userId, pageId);
    if (!document) return failure(`Document not found: ${pageId}`);
    const childCount = await prisma.reader_document.count({ where: { readerSpaceId: document.readerSpaceId, parentId: pageId, deletedAt: null } });
    if (childCount) return failure("Move or delete child documents before deleting this document.");
    await prisma.reader_document.update({ where: { id: pageId }, data: { deletedAt: new Date(), updatedById: userId } });
    return text({ success: true, deletedPageId: pageId });
  });

  server.tool("reader_get_page_sections", "List stable numeric Markdown sections for surgical edits.", { pageId: z.string() }, async ({ pageId }) => {
    const document = await documentForUser(userId, pageId);
    if (!document || document.revisions.length === 0) return failure(`Document not found: ${pageId}`);
    const sections = await parseMarkdownSectionsAst(document.revisions[0].markdown);
    return text(sections.map(({ startOffset: _startOffset, headingEndOffset: _headingEndOffset, endOffset: _endOffset, ...section }) => section));
  });

  server.tool("reader_update_section", "Replace one Markdown section body with optimistic concurrency protection.", { pageId: z.string(), baseRevision: z.number().int().positive(), sectionIndex: z.number().int().min(0), newContent: z.string(), preserveHeading: z.boolean().optional().default(true) }, async ({ pageId, baseRevision, sectionIndex, newContent, preserveHeading }) => {
    const document = await documentForUser(userId, pageId);
    if (!document || document.revisions.length === 0) return failure(`Document not found: ${pageId}`);
    try {
      const change = await replaceSectionBody(document.revisions[0].markdown, sectionIndex, newContent, preserveHeading);
      const result = await commitMarkdown(userId, pageId, baseRevision, change.markdown);
      return result.kind === "updated" ? text({ success: true, pageId, revisionNumber: result.revision, sectionIndex }) : failure(result.kind === "conflict" ? `Conflict: current revision is ${result.revision ?? "newer"}` : result.kind === "missing" ? `Document not found: ${pageId}` : result.message);
    } catch (error) { return failure(error instanceof Error ? error.message : "Unable to update section"); }
  });

  server.tool("reader_replace_lines", "Replace a Markdown line range with optimistic concurrency protection.", { pageId: z.string(), baseRevision: z.number().int().positive(), startLine: z.number().int().min(1), endLine: z.number().int().min(1), replacementContent: z.string(), expectedContent: z.string().optional() }, async ({ pageId, baseRevision, startLine, endLine, replacementContent, expectedContent }) => {
    const document = await documentForUser(userId, pageId);
    if (!document || document.revisions.length === 0) return failure(`Document not found: ${pageId}`);
    try {
      const updated = replaceLines(document.revisions[0].markdown, startLine, endLine, replacementContent, expectedContent);
      const result = await commitMarkdown(userId, pageId, baseRevision, updated);
      return result.kind === "updated" ? text({ success: true, pageId, revisionNumber: result.revision }) : failure(result.kind === "conflict" ? `Conflict: current revision is ${result.revision ?? "newer"}` : result.kind === "missing" ? `Document not found: ${pageId}` : result.message);
    } catch (error) { return failure(error instanceof Error ? error.message : "Unable to replace lines"); }
  });

  server.tool("reader_insert_section", "Insert a Markdown section with optimistic concurrency protection.", { pageId: z.string(), baseRevision: z.number().int().positive(), heading: z.string(), content: z.string(), afterSectionIndex: z.number().int().optional() }, async ({ pageId, baseRevision, heading, content, afterSectionIndex }) => {
    const document = await documentForUser(userId, pageId);
    if (!document || document.revisions.length === 0) return failure(`Document not found: ${pageId}`);
    const updated = await insertSection(document.revisions[0].markdown, afterSectionIndex, heading, content);
    const result = await commitMarkdown(userId, pageId, baseRevision, updated);
    return result.kind === "updated" ? text({ success: true, pageId, revisionNumber: result.revision }) : failure(result.kind === "conflict" ? `Conflict: current revision is ${result.revision ?? "newer"}` : result.kind === "missing" ? `Document not found: ${pageId}` : result.message);
  });
}
