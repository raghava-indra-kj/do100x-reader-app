import { Router } from "express";
import { z } from "zod";
import { locateSections, sectionAnchorKeys, sectionSubtreeSource } from "@reader/md-ast";
import { prisma } from "./prisma";
import { readSession, requireSession } from "./session";
import { canReadPage } from "./page-access";
import { contentHash, jsonValue } from "./page-content";

/** Reading aids a page or heading can carry. New labels are added here; the column is free-form text. */
export const ANNOTATION_KINDS = ["summary", "key_takeaway", "try_this", "be_aware", "diagram"] as const;

type StoredAnchor = { type: "page" } | { type: "heading"; key: string; level: number; titleSnapshot: string };

const anchorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("page") }),
  z.object({ type: z.literal("heading"), key: z.string().min(1).max(200) }),
]);

const createSchema = z.object({
  pageId: z.string().min(1),
  anchor: anchorSchema,
  /** Replace this user's AI-written items of the same kinds on the same anchor (regeneration). */
  replace: z.boolean().optional(),
  items: z.array(z.object({
    kind: z.enum(ANNOTATION_KINDS),
    title: z.string().trim().min(1).max(500),
    content: z.string().trim().min(1).max(100_000),
    placement: z.enum(["before", "after"]).nullable().optional(),
  })).min(1).max(20),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  content: z.string().trim().min(1).max(100_000).optional(),
  placement: z.enum(["before", "after"]).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

const reorderSchema = z.object({
  pageId: z.string().min(1),
  /** Item ids in their new order; each gets its position as `displayOrder`. */
  ids: z.array(z.string().min(1)).min(1).max(200),
});

/** Resolve a client anchor against the current page source; null when the heading no longer exists. */
function resolveAnchor(content: string, anchor: z.infer<typeof anchorSchema>): { anchor: StoredAnchor; source: string } | null {
  if (anchor.type === "page") return { anchor: { type: "page" }, source: content };
  const ranges = locateSections(content);
  const index = sectionAnchorKeys(ranges).indexOf(anchor.key);
  if (index < 0) return null;
  const range = ranges[index];
  return {
    anchor: { type: "heading", key: anchor.key, level: range.level, titleSnapshot: range.title ?? "" },
    source: sectionSubtreeSource(content, ranges, index),
  };
}

const sameAnchor = (a: StoredAnchor, b: StoredAnchor) => a.type === b.type && (a.type === "page" || (b.type === "heading" && a.key === b.key));

type Row = Awaited<ReturnType<typeof prisma.page_annotation.findMany>>[number];

function toDto(row: Row, stale: boolean) {
  return {
    id: row.id,
    pageId: row.pageId,
    anchor: row.anchor as StoredAnchor,
    kind: row.kind,
    title: row.title,
    content: row.content,
    format: row.format,
    displayOrder: row.displayOrder,
    placement: row.placement ?? null,
    origin: row.origin,
    stale,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const router = Router();
router.use((req, res, next) => req.method === "GET" ? next() : requireSession(req, res, next));

// GET /page-annotations?pageId=  — the signed-in user's own items; guests have none.
router.get("/", async (req, res) => {
  const pageId = typeof req.query.pageId === "string" ? req.query.pageId : "";
  if (!pageId) { res.status(400).json({ message: "Choose a page." }); return; }
  const userId = readSession(req);
  if (!userId) { res.json([]); return; }
  if (!await canReadPage(prisma, pageId, userId)) { res.status(404).json({ message: "Page not found" }); return; }

  const [page, rows] = await Promise.all([
    prisma.page.findFirst({ where: { id: pageId, deletedAt: null }, select: { content: true } }),
    prisma.page_annotation.findMany({ where: { pageId, userId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const content = page?.content ?? "";
  const ranges = locateSections(content);
  const keys = sectionAnchorKeys(ranges);
  res.json(rows.map((row) => {
    const anchor = row.anchor as StoredAnchor;
    let current: string | null = content;
    if (anchor.type === "heading") {
      const index = keys.indexOf(anchor.key);
      current = index < 0 ? null : sectionSubtreeSource(content, ranges, index);
    }
    return toDto(row, current === null || row.sourceHash !== contentHash(current));
  }));
});

// POST /page-annotations — create one or more items on an anchor, optionally replacing earlier AI items.
router.post("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Check the takeaways and try again." }); return; }
  const { pageId, anchor, items, replace } = parsed.data;
  if (!await canReadPage(prisma, pageId, userId)) { res.status(404).json({ message: "Page not found" }); return; }

  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null }, select: { content: true } });
  const resolved = resolveAnchor(page?.content ?? "", anchor);
  if (!resolved) { res.status(409).json({ message: "This section has changed. Reload the page and try again." }); return; }
  const sourceHash = contentHash(resolved.source);

  const created = await prisma.$transaction(async (tx) => {
    const existing = (await tx.page_annotation.findMany({ where: { pageId, userId }, select: { id: true, anchor: true, displayOrder: true, origin: true, kind: true } }))
      .filter((row) => sameAnchor(row.anchor as StoredAnchor, resolved.anchor));
    const kinds = new Set<string>(items.map((item) => item.kind));
    const replaced = replace ? existing.filter((row) => row.origin === "ai" && kinds.has(row.kind)) : [];
    if (replaced.length) await tx.page_annotation.deleteMany({ where: { id: { in: replaced.map((row) => row.id) }, userId } });
    const replacedIds = new Set(replaced.map((row) => row.id));
    let order = Math.max(-1, ...existing.filter((row) => !replacedIds.has(row.id)).map((row) => row.displayOrder)) + 1;
    const rows: Row[] = [];
    for (const item of items) {
      rows.push(await tx.page_annotation.create({
        data: {
          userId, pageId, anchor: jsonValue(resolved.anchor), kind: item.kind, title: item.title, content: item.content,
          displayOrder: order++, placement: item.placement ?? null, sourceHash, origin: "ai",
        },
      }));
    }
    return rows;
  });
  res.status(201).json(created.map((row) => toDto(row, false)));
});

// POST /page-annotations/reorder — persist a new order for items the user owns on one page.
router.post("/reorder", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Check the order and try again." }); return; }
  const { pageId, ids } = parsed.data;
  await prisma.$transaction(ids.map((id, index) => prisma.page_annotation.updateMany({ where: { id, userId, pageId }, data: { displayOrder: index } })));
  res.status(204).end();
});

// PATCH /page-annotations/:id — edit text or placement. An edited item is the reader's own, so regeneration keeps it.
router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Check the takeaway and try again." }); return; }
  const result = await prisma.page_annotation.updateMany({ where: { id: req.params.id as string, userId: res.locals.userId as string }, data: { ...parsed.data, origin: "manual" } });
  if (!result.count) { res.status(404).json({ message: "Takeaway not found" }); return; }
  res.status(204).end();
});

// DELETE /page-annotations/:id
router.delete("/:id", async (req, res) => {
  const result = await prisma.page_annotation.deleteMany({ where: { id: req.params.id as string, userId: res.locals.userId as string } });
  if (!result.count) { res.status(404).json({ message: "Takeaway not found" }); return; }
  res.status(204).end();
});

export default router;
