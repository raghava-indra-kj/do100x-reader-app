import { Router } from "express";
import { prisma } from "./prisma";
import { hasDocumentPermission, resolveDocumentAccess } from "./reader-documents";

const router = Router();

type AnnotationWithDocument = {
  id: string;
  documentId: string;
  sectionTitle: string | null;
  exactQuote: string;
  body: string;
  linkedDocumentId: string | null;
  isExplanation: boolean;
  createdAt: Date;
  updatedAt: Date;
  document: { title: string };
};

function toPayload(annotation: AnnotationWithDocument) {
  return { id: annotation.id, pageId: annotation.documentId, pageTitle: annotation.document.title, sectionTitle: annotation.sectionTitle, selectedText: annotation.exactQuote, body: annotation.body, linkedPageId: annotation.linkedDocumentId, isExplanation: annotation.isExplanation, createdAt: annotation.createdAt, updatedAt: annotation.updatedAt };
}

router.get("/", async (req, res, next) => {
  try {
    const pageId = typeof req.query.pageId === "string" ? req.query.pageId : undefined;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const isExplanation = typeof req.query.isExplanation === "string" ? req.query.isExplanation === "true" : undefined;
    const userId = req.auth!.user.id;
    if (!pageId && !date) return res.status(400).json({ message: "pageId or date query parameter is required" });

    if (pageId) {
      const access = await resolveDocumentAccess({ documentId: pageId, userId });
      if (!access || !hasDocumentPermission(access.permission, "viewer")) return res.status(404).json({ message: "Document not found" });
      const annotations = await prisma.reader_document_annotation.findMany({ where: { documentId: pageId, ...(isExplanation === undefined ? {} : { isExplanation }) }, include: { document: { select: { title: true } } }, orderBy: { createdAt: "desc" } });
      return res.json(annotations.map(toPayload));
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) return res.status(400).json({ message: "Invalid date (expected YYYY-MM-DD)" });
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ message: "Invalid date (expected YYYY-MM-DD)" });
    const annotations = await prisma.reader_document_annotation.findMany({
      where: { authorId: userId, createdAt: { gte: start, lt: new Date(start.getTime() + 86_400_000) }, ...(isExplanation === undefined ? {} : { isExplanation }) },
      include: { document: { select: { title: true } } }, orderBy: { createdAt: "desc" },
    });
    return res.json(annotations.map(toPayload));
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = req.auth!.user.id;
    const pageId = typeof req.body?.pageId === "string" ? req.body.pageId : "";
    const selectedText = typeof req.body?.selectedText === "string" ? req.body.selectedText : "";
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    if (!pageId || !body) return res.status(400).json({ message: "pageId and body are required" });
    const access = await resolveDocumentAccess({ documentId: pageId, userId });
    if (!access || !hasDocumentPermission(access.permission, "viewer")) return res.status(404).json({ message: "Document not found" });
    const revision = await prisma.reader_document_revision.findUnique({ where: { documentId_revisionNumber: { documentId: pageId, revisionNumber: access.document.currentRevisionNumber } }, select: { id: true, markdown: true } });
    if (!revision) return res.status(409).json({ message: "Document head revision is missing" });
    const offset = selectedText ? revision.markdown.indexOf(selectedText) : -1;
    const endOffset = offset < 0 ? 0 : offset + selectedText.length;
    const annotation = await prisma.reader_document_annotation.create({ data: {
      documentId: pageId, revisionId: revision.id, authorId: userId, startOffset: Math.max(offset, 0), endOffset, exactQuote: selectedText,
      prefix: offset < 0 ? null : revision.markdown.slice(Math.max(0, offset - 64), offset), suffix: offset < 0 ? null : revision.markdown.slice(endOffset, endOffset + 64), body,
      sectionTitle: typeof req.body?.sectionTitle === "string" ? req.body.sectionTitle : null,
      linkedDocumentId: typeof req.body?.linkedPageId === "string" ? req.body.linkedPageId : null, isExplanation: req.body?.isExplanation === true,
    } });
    return res.status(201).json(annotation.id);
  } catch (error) { next(error); }
});

async function editableAnnotation(id: string, userId: string) {
  const annotation = await prisma.reader_document_annotation.findUnique({ where: { id }, select: { id: true, documentId: true, authorId: true } });
  if (!annotation) return null;
  const access = await resolveDocumentAccess({ documentId: annotation.documentId, userId });
  return access && (annotation.authorId === userId || hasDocumentPermission(access.permission, "admin")) ? annotation : null;
}

router.put("/:commentId", async (req, res, next) => {
  try {
    const annotation = await editableAnnotation(req.params.commentId, req.auth!.user.id);
    if (!annotation) return res.status(404).json({ message: "Comment not found" });
    if (typeof req.body?.body !== "string") return res.status(400).json({ message: "body must be a string" });
    await prisma.reader_document_annotation.update({ where: { id: annotation.id }, data: { body: req.body.body, ...(req.body.linkedPageId === undefined ? {} : { linkedDocumentId: typeof req.body.linkedPageId === "string" ? req.body.linkedPageId : null }) } });
    return res.status(204).send();
  } catch (error) { next(error); }
});

router.delete("/", async (req, res, next) => {
  try {
    const pageId = typeof req.query.pageId === "string" ? req.query.pageId : "";
    if (!pageId) return res.status(400).json({ message: "pageId query parameter is required" });
    const access = await resolveDocumentAccess({ documentId: pageId, userId: req.auth!.user.id });
    if (!access || !hasDocumentPermission(access.permission, "viewer")) return res.status(404).json({ message: "Document not found" });
    await prisma.reader_document_annotation.deleteMany({ where: { documentId: pageId, authorId: req.auth!.user.id } });
    return res.status(204).send();
  } catch (error) { next(error); }
});

router.delete("/:commentId", async (req, res, next) => {
  try {
    const annotation = await editableAnnotation(req.params.commentId, req.auth!.user.id);
    if (!annotation) return res.status(404).json({ message: "Comment not found" });
    await prisma.reader_document_annotation.delete({ where: { id: annotation.id } });
    return res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
