import { createHash, randomBytes, randomUUID } from "crypto";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { requireAuth } from "./auth";
import { prisma } from "./prisma";
import { ensurePersonalReaderSpace, getReaderSpaceContext, roleAllows, type ReaderRole } from "./reader-space";

const router = Router();
const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;
const MARKDOWN_FORMAT_VERSION = "reader-markdown-v1";
const ASSISTANT_PROMPT_FIELDS = ["meaningSystemPrompt", "explanationSystemPrompt", "doubtSystemPrompt"] as const;

type DocumentPermission = "none" | "viewer" | "editor" | "admin" | "owner";

export interface DocumentAccess {
  document: {
    id: string;
    readerSpaceId: string;
    parentId: string | null;
    title: string;
    category: string | null;
    meaningSystemPrompt: string | null;
    explanationSystemPrompt: string | null;
    doubtSystemPrompt: string | null;
    orderKey: string;
    visibility: string;
    currentRevisionNumber: number;
    headRevisionId: string | null;
    createdById: string;
    updatedById: string;
    createdAt: Date;
    updatedAt: Date;
  };
  permission: DocumentPermission;
  viaShareLink: boolean;
}

function toDocumentPermission(role: ReaderRole): DocumentPermission {
  return role;
}

function normalizeGrantRole(role: string): "viewer" | "editor" | "none" {
  return role === "editor" ? "editor" : role === "viewer" ? "viewer" : "none";
}

function permissionWeight(permission: DocumentPermission): number {
  return ({ none: 0, viewer: 1, editor: 2, admin: 3, owner: 4 } as const)[permission];
}

function bestPermission(...permissions: DocumentPermission[]): DocumentPermission {
  return permissions.reduce<DocumentPermission>((best, candidate) =>
    permissionWeight(candidate) > permissionWeight(best) ? candidate : best,
  "none");
}

export function hasDocumentPermission(permission: DocumentPermission, required: Exclude<DocumentPermission, "none">): boolean {
  return permissionWeight(permission) >= permissionWeight(required);
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function createShareSecret(): string {
  return `rshare_${randomBytes(32).toString("base64url")}`;
}

function hashMarkdown(markdown: string): string {
  return createHash("sha256").update(markdown, "utf8").digest("hex");
}

function validateMarkdown(markdown: unknown): string | null {
  if (typeof markdown !== "string") return "markdown must be a string";
  if (Buffer.byteLength(markdown, "utf8") > MAX_MARKDOWN_BYTES) {
    return "markdown exceeds the 5 MB document limit";
  }
  if (markdown.includes("\u0000")) return "markdown cannot contain NUL characters";
  return null;
}

function parseAssistantPromptFields(body: unknown):
  | { ok: true; data: Partial<Record<(typeof ASSISTANT_PROMPT_FIELDS)[number], string | null>> }
  | { ok: false; message: string } {
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const data: Partial<Record<(typeof ASSISTANT_PROMPT_FIELDS)[number], string | null>> = {};
  for (const field of ASSISTANT_PROMPT_FIELDS) {
    const value = source[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      return { ok: false, message: `${field} must be a string or null` };
    }
    if (typeof value === "string" && value.length > 100_000) {
      return { ok: false, message: `${field} exceeds the 100,000 character limit` };
    }
    data[field] = value;
  }
  return { ok: true, data };
}

function parsePositiveRevision(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function orderKeyForNewDocument(): string {
  // Time-prefix ordering makes appends stable without re-numbering siblings.
  // The random suffix avoids collisions when several writes land in one millisecond.
  return `${Date.now().toString(36).padStart(10, "0")}-${randomBytes(4).toString("hex")}`;
}

function inferPropertyType(value: unknown): "text" | "number" | "boolean" | "json" {
  if (typeof value === "string") return "text";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "boolean") return "boolean";
  return "json";
}

function isValidPropertyKey(key: string): boolean {
  return /^[A-Za-z][A-Za-z0-9:_-]{0,127}$/.test(key);
}

function isPersistableJson(value: unknown): value is Prisma.InputJsonValue {
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isPersistableJson);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).every(isPersistableJson);
  }
  return false;
}

async function readDocumentProperties(documentId: string) {
  const values = await prisma.reader_document_property_value.findMany({
    where: { documentId },
    select: { valueJson: true, definition: { select: { key: true, label: true, valueType: true } } },
  });
  return Object.fromEntries(values.map((value) => [value.definition.key, {
    value: value.valueJson,
    label: value.definition.label,
    valueType: value.definition.valueType,
  }]));
}

export async function resolveDocumentAccess({
  documentId,
  userId,
  shareSecret,
}: {
  documentId: string;
  userId?: string;
  shareSecret?: string;
}): Promise<DocumentAccess | null> {
  const document = await prisma.reader_document.findFirst({
    where: { id: documentId, deletedAt: null },
    select: {
      id: true,
      readerSpaceId: true,
      parentId: true,
      title: true,
      category: true,
      meaningSystemPrompt: true,
      explanationSystemPrompt: true,
      doubtSystemPrompt: true,
      orderKey: true,
      visibility: true,
      currentRevisionNumber: true,
      headRevisionId: true,
      createdById: true,
      updatedById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!document) return null;

  let workspacePermission: DocumentPermission = "none";
  let grantPermission: DocumentPermission = "none";
  let creatorPermission: DocumentPermission = "none";
  if (userId) {
    const [context, grant] = await Promise.all([
      getReaderSpaceContext(prisma, document.readerSpaceId, userId),
      prisma.reader_document_grant.findUnique({
        where: { documentId_userId: { documentId, userId } },
        select: { role: true },
      }),
    ]);
    workspacePermission = context ? toDocumentPermission(context.role) : "none";
    grantPermission = normalizeGrantRole(grant?.role ?? "none");
    // A workspace editor who authored a document may manage its direct sharing
    // without gaining administration rights over the whole workspace.
    creatorPermission = document.createdById === userId ? "admin" : "none";
  }

  let viaShareLink = false;
  if (shareSecret) {
    const link = await prisma.reader_document_share_link.findUnique({
      where: { tokenHash: hashSecret(shareSecret) },
      select: { documentId: true, revokedAt: true, expiresAt: true },
    });
    viaShareLink = Boolean(
      link
      && link.documentId === document.id
      && !link.revokedAt
      && (!link.expiresAt || link.expiresAt.getTime() > Date.now()),
    );
  }

  const permission = bestPermission(
    workspacePermission,
    grantPermission,
    creatorPermission,
    viaShareLink ? "viewer" : "none",
  );
  if (permission === "none") return null;
  return { document, permission, viaShareLink };
}

async function getLatestRevision(documentId: string, revisionNumber: number) {
  return prisma.reader_document_revision.findUnique({
    where: { documentId_revisionNumber: { documentId, revisionNumber } },
    select: {
      id: true,
      revisionNumber: true,
      parentRevisionId: true,
      markdown: true,
      contentHash: true,
      formatVersion: true,
      createdById: true,
      createdAt: true,
    },
  });
}

function toDocumentPayload(
  access: DocumentAccess,
  revision: NonNullable<Awaited<ReturnType<typeof getLatestRevision>>>,
  childrenCount: number,
) {
  return {
    id: access.document.id,
    readerSpaceId: access.document.readerSpaceId,
    parentDocumentId: access.document.parentId,
    title: access.document.title,
    category: access.document.category,
    meaningSystemPrompt: access.document.meaningSystemPrompt,
    explanationSystemPrompt: access.document.explanationSystemPrompt,
    doubtSystemPrompt: access.document.doubtSystemPrompt,
    orderKey: access.document.orderKey,
    childrenCount,
    visibility: access.document.visibility,
    permission: access.permission,
    isSharedLink: access.viaShareLink,
    createdAt: access.document.createdAt,
    updatedAt: access.document.updatedAt,
    revision: {
      id: revision.id,
      number: revision.revisionNumber,
      parentRevisionId: revision.parentRevisionId,
      markdown: revision.markdown,
      contentHash: revision.contentHash,
      formatVersion: revision.formatVersion,
      createdById: revision.createdById,
      createdAt: revision.createdAt,
    },
  };
}

function readShareSecret(req: { get(name: string): string | undefined; query: Record<string, unknown> }): string | undefined {
  const header = req.get("x-reader-share-token")?.trim();
  if (header) return header;
  const queryValue = req.query.share;
  return typeof queryValue === "string" && queryValue.trim() ? queryValue.trim() : undefined;
}

async function requireDocumentPermission(
  req: Parameters<typeof readShareSecret>[0] & { auth?: { user: { id: string } } },
  res: { status(code: number): { json(payload: unknown): void } },
  documentId: string,
  required: Exclude<DocumentPermission, "none">,
): Promise<DocumentAccess | null> {
  const access = await resolveDocumentAccess({
    documentId,
    userId: req.auth?.user.id,
    shareSecret: readShareSecret(req),
  });
  if (!access || !hasDocumentPermission(access.permission, required)) {
    // Do not disclose the existence of documents outside a caller's scope.
    res.status(404).json({ message: "Document not found" });
    return null;
  }
  return access;
}

// GET /reader/documents/:documentId supports an authenticated workspace member,
// a direct grant recipient, or a scoped read-only share token.
router.get("/:documentId", async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "viewer");
    if (!access) return;
    const revision = await getLatestRevision(access.document.id, access.document.currentRevisionNumber);
    if (!revision) {
      res.status(500).json({ message: "Document head revision is missing" });
      return;
    }
    const childrenCount = await prisma.reader_document.count({
      where: { parentId: access.document.id, deletedAt: null },
    });
    res.json(toDocumentPayload(access, revision, childrenCount));
  } catch (error) {
    next(error);
  }
});

// GET /reader/documents/:documentId/revisions
router.get("/:documentId/revisions", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "viewer");
    if (!access) return;
    const revisions = await prisma.reader_document_revision.findMany({
      where: { documentId: access.document.id },
      orderBy: { revisionNumber: "desc" },
      select: {
        id: true,
        revisionNumber: true,
        parentRevisionId: true,
        contentHash: true,
        formatVersion: true,
        createdById: true,
        createdAt: true,
      },
    });
    res.json(revisions.map((revision) => ({
      id: revision.id,
      number: revision.revisionNumber,
      parentRevisionId: revision.parentRevisionId,
      contentHash: revision.contentHash,
      formatVersion: revision.formatVersion,
      createdById: revision.createdById,
      createdAt: revision.createdAt,
    })));
  } catch (error) {
    next(error);
  }
});

// GET /reader/documents/:documentId/properties
router.get("/:documentId/properties", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "viewer");
    if (!access) return;
    res.json({ documentId: access.document.id, properties: await readDocumentProperties(access.document.id) });
  } catch (error) {
    next(error);
  }
});

// PUT /reader/documents/:documentId/properties
// Custom keys are registered once per Reader space with an inferred type;
// subsequent writes must keep that type so filters/integrations stay reliable.
router.put("/:documentId/properties", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "editor");
    if (!access) return;
    const properties = req.body?.properties;
    const mode = req.body?.mode === "replace" ? "replace" : "merge";
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
      res.status(400).json({ message: "properties must be an object" });
      return;
    }
    const entries = Object.entries(properties);
    if (entries.length === 0) {
      res.status(400).json({ message: "properties cannot be empty" });
      return;
    }
    const invalidKey = entries.find(([key]) => !isValidPropertyKey(key));
    if (invalidKey) {
      res.status(400).json({ message: `Invalid property key: ${invalidKey[0]}` });
      return;
    }
    const invalidValue = entries.find(([, value]) => !isPersistableJson(value));
    if (invalidValue) {
      res.status(400).json({ message: `Invalid property value for key: ${invalidValue[0]}` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const definitions = await tx.reader_property_definition.findMany({
        where: { readerSpaceId: access.document.readerSpaceId, key: { in: entries.map(([key]) => key) } },
      });
      const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));

      for (const [key, value] of entries) {
        const inferredType = inferPropertyType(value);
        let definition = definitionByKey.get(key);
        if (definition && definition.valueType !== inferredType) {
          throw new Error(`Property ${key} has type ${definition.valueType} and cannot be written as ${inferredType}`);
        }
        if (!definition) {
          definition = await tx.reader_property_definition.upsert({
            where: { readerSpaceId_key: { readerSpaceId: access.document.readerSpaceId, key } },
            update: {},
            create: { readerSpaceId: access.document.readerSpaceId, key, label: key, valueType: inferredType },
          });
          if (definition.valueType !== inferredType) {
            throw new Error(`Property ${key} has type ${definition.valueType} and cannot be written as ${inferredType}`);
          }
          definitionByKey.set(key, definition);
        }
        await tx.reader_document_property_value.upsert({
          where: { documentId_definitionId: { documentId: access.document.id, definitionId: definition.id } },
          update: { valueJson: value as Prisma.InputJsonValue },
          create: { documentId: access.document.id, definitionId: definition.id, valueJson: value as Prisma.InputJsonValue },
        });
      }

      if (mode === "replace") {
        await tx.reader_document_property_value.deleteMany({
          where: {
            documentId: access.document.id,
            definition: { key: { notIn: entries.map(([key]) => key) } },
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.json({ documentId: access.document.id, properties: await readDocumentProperties(access.document.id) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Property ")) {
      res.status(409).json({ message: error.message });
      return;
    }
    next(error);
  }
});

// DELETE /reader/documents/:documentId/properties
router.delete("/:documentId/properties", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "editor");
    if (!access) return;
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    if (keys.length === 0 || keys.some((key) => typeof key !== "string" || !isValidPropertyKey(key))) {
      res.status(400).json({ message: "keys must be a non-empty list of valid property keys" });
      return;
    }
    await prisma.reader_document_property_value.deleteMany({
      where: { documentId: access.document.id, definition: { key: { in: keys } } },
    });
    res.json({ documentId: access.document.id, properties: await readDocumentProperties(access.document.id) });
  } catch (error) {
    next(error);
  }
});

// Direct grants are intentionally limited to existing accounts for now. They
// are durable access records, while email invitations need a delivery provider
// and acceptance workflow rather than an unreliable placeholder implementation.
router.get("/:documentId/grants", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "admin");
    if (!access) return;
    const grants = await prisma.reader_document_grant.findMany({
      where: { documentId: access.document.id },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        account: { select: { email: true, displayName: true, avatarUrl: true } },
      },
    });
    res.json(grants.map((grant) => ({
      userId: grant.userId,
      role: grant.role,
      createdAt: grant.createdAt,
      email: grant.account.email,
      displayName: grant.account.displayName,
      avatarUrl: grant.account.avatarUrl,
    })));
  } catch (error) {
    next(error);
  }
});

router.put("/:documentId/grants", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "admin");
    if (!access) return;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const role = req.body?.role === "editor" ? "editor" : req.body?.role === "viewer" ? "viewer" : null;
    if (!email || !role) {
      res.status(400).json({ message: "email and a viewer or editor role are required" });
      return;
    }
    const account = await prisma.user_account.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, avatarUrl: true },
    });
    if (!account) {
      res.status(404).json({ message: "No account exists for that email yet" });
      return;
    }
    await prisma.reader_document_grant.upsert({
      where: { documentId_userId: { documentId: access.document.id, userId: account.id } },
      update: { role, grantedById: req.auth!.user.id },
      create: { documentId: access.document.id, userId: account.id, role, grantedById: req.auth!.user.id },
    });
    res.json({ userId: account.id, email: account.email, displayName: account.displayName, avatarUrl: account.avatarUrl, role });
  } catch (error) {
    next(error);
  }
});

router.delete("/:documentId/grants/:userId", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "admin");
    if (!access) return;
    const result = await prisma.reader_document_grant.deleteMany({
      where: { documentId: access.document.id, userId: req.params.userId },
    });
    if (result.count === 0) {
      res.status(404).json({ message: "Document grant not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /reader/documents/:documentId/share-links
// Secrets are deliberately never returned here: a token is shown exactly once
// at creation time, while this endpoint supports audit and revocation.
router.get("/:documentId/share-links", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "admin");
    if (!access) return;
    const links = await prisma.reader_document_share_link.findMany({
      where: { documentId: access.document.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, expiresAt: true, revokedAt: true, createdAt: true, createdById: true },
    });
    res.json(links);
  } catch (error) {
    next(error);
  }
});

// GET /reader/documents?readerSpaceId=&parentDocumentId=
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const requestedSpaceId = typeof req.query.readerSpaceId === "string" ? req.query.readerSpaceId : undefined;
    const personal = requestedSpaceId ? null : await ensurePersonalReaderSpace(req.auth!.user.id);
    const readerSpaceId = requestedSpaceId ?? personal!.readerSpaceId;
    const context = await getReaderSpaceContext(prisma, readerSpaceId, req.auth!.user.id);
    if (!context || !roleAllows(context.role, "viewer")) {
      res.status(404).json({ message: "Reader space not found" });
      return;
    }

    const parentDocumentId = typeof req.query.parentDocumentId === "string"
      ? (req.query.parentDocumentId === "null" ? null : req.query.parentDocumentId)
      : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const documents = await prisma.reader_document.findMany({
      where: {
        readerSpaceId,
        deletedAt: null,
        ...(parentDocumentId === undefined ? {} : { parentId: parentDocumentId }),
        ...(search ? { title: { contains: search } } : {}),
      },
      orderBy: [{ orderKey: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        parentId: true,
        title: true,
        category: true,
        orderKey: true,
        currentRevisionNumber: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    const childGroups = documents.length === 0 ? [] : await prisma.reader_document.groupBy({
      by: ["parentId"],
      where: { parentId: { in: documents.map((document) => document.id) }, deletedAt: null },
      _count: { _all: true },
    });
    const childCountByDocumentId = new Map(childGroups.map((group) => [group.parentId, group._count._all]));
    res.json(documents.map((document) => ({
      id: document.id,
      parentDocumentId: document.parentId,
      title: document.title,
      category: document.category,
      orderKey: document.orderKey,
      childrenCount: childCountByDocumentId.get(document.id) ?? 0,
      revisionNumber: document.currentRevisionNumber,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })));
  } catch (error) {
    next(error);
  }
});

// POST /reader/documents
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const markdown = req.body?.markdown;
    const parentDocumentId = typeof req.body?.parentDocumentId === "string" ? req.body.parentDocumentId : null;
    const requestedSpaceId = typeof req.body?.readerSpaceId === "string" ? req.body.readerSpaceId : undefined;
    const category = typeof req.body?.category === "string" && req.body.category.trim() ? req.body.category.trim() : null;
    const markdownError = validateMarkdown(markdown);
    const assistantPrompts = parseAssistantPromptFields(req.body);
    if (!title) {
      res.status(400).json({ message: "title is required" });
      return;
    }
    if (title.length > 1000) {
      res.status(400).json({ message: "title exceeds 1000 characters" });
      return;
    }
    if (markdownError) {
      res.status(400).json({ message: markdownError });
      return;
    }
    if (!assistantPrompts.ok) {
      res.status(400).json({ message: assistantPrompts.message });
      return;
    }

    const personal = requestedSpaceId ? null : await ensurePersonalReaderSpace(req.auth!.user.id);
    const readerSpaceId = requestedSpaceId ?? personal!.readerSpaceId;
    const context = await getReaderSpaceContext(prisma, readerSpaceId, req.auth!.user.id);
    if (!context || !roleAllows(context.role, "editor")) {
      res.status(403).json({ message: "You do not have permission to create documents in this Reader space" });
      return;
    }

    if (parentDocumentId) {
      const parent = await prisma.reader_document.findFirst({
        where: { id: parentDocumentId, readerSpaceId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) {
        res.status(404).json({ message: "Parent document not found" });
        return;
      }
    }

    const documentId = randomUUID();
    const revisionId = randomUUID();
    const document = await prisma.reader_document.create({
      data: {
        id: documentId,
        readerSpaceId,
        parentId: parentDocumentId,
        title,
        category,
        ...assistantPrompts.data,
        orderKey: orderKeyForNewDocument(),
        currentRevisionNumber: 1,
        headRevisionId: revisionId,
        createdById: req.auth!.user.id,
        updatedById: req.auth!.user.id,
        revisions: {
          create: {
            id: revisionId,
            revisionNumber: 1,
            markdown,
            contentHash: hashMarkdown(markdown),
            formatVersion: MARKDOWN_FORMAT_VERSION,
            createdById: req.auth!.user.id,
          },
        },
      },
    });
    res.status(201).json({ id: document.id, revisionNumber: 1 });
  } catch (error) {
    next(error);
  }
});

// PUT /reader/documents/:documentId
// Every content write must name the revision it started from. A mismatch
// returns 409 rather than losing another editor's work.
router.put("/:documentId", requireAuth, async (req, res, next) => {
  try {
    const documentId = req.params.documentId;
    const access = await requireDocumentPermission(req, res, documentId, "editor");
    if (!access) return;
    if (access.viaShareLink) {
      res.status(403).json({ message: "Share links are read-only" });
      return;
    }

    const baseRevision = parsePositiveRevision(req.body?.baseRevision);
    const markdown = req.body?.markdown;
    const markdownError = validateMarkdown(markdown);
    const title = req.body?.title === undefined ? undefined : typeof req.body.title === "string" ? req.body.title.trim() : null;
    const category = req.body?.category === undefined
      ? undefined
      : typeof req.body.category === "string" && req.body.category.trim() ? req.body.category.trim() : null;
    const assistantPrompts = parseAssistantPromptFields(req.body);
    if (!baseRevision) {
      res.status(400).json({ message: "baseRevision must be a positive integer" });
      return;
    }
    if (markdownError) {
      res.status(400).json({ message: markdownError });
      return;
    }
    if (!assistantPrompts.ok) {
      res.status(400).json({ message: assistantPrompts.message });
      return;
    }
    if (title === null || !title || title.length > 1000) {
      res.status(400).json({ message: "title must be a non-empty string up to 1000 characters" });
      return;
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const current = await tx.reader_document.findFirst({
        where: { id: documentId, deletedAt: null },
        select: { currentRevisionNumber: true, headRevisionId: true },
      });
      if (!current) return { kind: "missing" as const };
      if (current.currentRevisionNumber !== baseRevision) {
        return { kind: "conflict" as const, currentRevisionNumber: current.currentRevisionNumber };
      }

      const nextRevisionNumber = current.currentRevisionNumber + 1;
      const revisionId = randomUUID();
      const update = await tx.reader_document.updateMany({
        where: { id: documentId, currentRevisionNumber: baseRevision, deletedAt: null },
        data: {
          currentRevisionNumber: nextRevisionNumber,
          headRevisionId: revisionId,
          updatedById: req.auth!.user.id,
          ...(title === undefined ? {} : { title }),
          ...(category === undefined ? {} : { category }),
          ...assistantPrompts.data,
        },
      });
      if (update.count !== 1) return { kind: "conflict" as const, currentRevisionNumber: null };

      await tx.reader_document_revision.create({
        data: {
          id: revisionId,
          documentId,
          revisionNumber: nextRevisionNumber,
          parentRevisionId: current.headRevisionId,
          markdown,
          contentHash: hashMarkdown(markdown),
          formatVersion: MARKDOWN_FORMAT_VERSION,
          createdById: req.auth!.user.id,
        },
      });
      return { kind: "updated" as const, revisionId, revisionNumber: nextRevisionNumber };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (outcome.kind === "missing") {
      res.status(404).json({ message: "Document not found" });
      return;
    }
    if (outcome.kind === "conflict") {
      const latest = await prisma.reader_document.findUnique({
        where: { id: documentId },
        select: { currentRevisionNumber: true, updatedAt: true },
      });
      res.status(409).json({
        message: "This document changed before your save could be applied",
        currentRevisionNumber: latest?.currentRevisionNumber ?? outcome.currentRevisionNumber,
        updatedAt: latest?.updatedAt ?? null,
      });
      return;
    }

    res.status(200).json({ id: documentId, revisionId: outcome.revisionId, revisionNumber: outcome.revisionNumber });
  } catch (error) {
    next(error);
  }
});

// DELETE /reader/documents/:documentId is a soft delete; revisions remain
// available for audit and recovery until an explicit retention process runs.
router.delete("/:documentId", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "editor");
    if (!access) return;
    if (access.viaShareLink) {
      res.status(403).json({ message: "Share links are read-only" });
      return;
    }
    const childCount = await prisma.reader_document.count({
      where: { readerSpaceId: access.document.readerSpaceId, parentId: access.document.id, deletedAt: null },
    });
    if (childCount > 0) {
      res.status(409).json({ message: "Move or delete child documents before deleting this document" });
      return;
    }
    await prisma.reader_document.update({
      where: { id: access.document.id },
      data: { deletedAt: new Date(), updatedById: req.auth!.user.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /reader/documents/reorder
// Swaps two sibling order keys atomically. Content revisions are untouched.
router.post("/reorder", requireAuth, async (req, res, next) => {
  try {
    const firstId = typeof req.body?.documentId1 === "string" ? req.body.documentId1 : "";
    const secondId = typeof req.body?.documentId2 === "string" ? req.body.documentId2 : "";
    if (!firstId || !secondId || firstId === secondId) {
      res.status(400).json({ message: "Two distinct document IDs are required" });
      return;
    }
    const [firstAccess, secondAccess] = await Promise.all([
      requireDocumentPermission(req, res, firstId, "editor"),
      resolveDocumentAccess({ documentId: secondId, userId: req.auth!.user.id }),
    ]);
    if (!firstAccess) return;
    if (!secondAccess || !hasDocumentPermission(secondAccess.permission, "editor") || secondAccess.viaShareLink) {
      res.status(404).json({ message: "Document not found" });
      return;
    }
    if (
      firstAccess.viaShareLink
      || firstAccess.document.readerSpaceId !== secondAccess.document.readerSpaceId
      || firstAccess.document.parentId !== secondAccess.document.parentId
    ) {
      res.status(403).json({ message: "Only sibling documents in the same Reader space can be reordered" });
      return;
    }
    await prisma.$transaction([
      prisma.reader_document.update({ where: { id: firstId }, data: { orderKey: secondAccess.document.orderKey } }),
      prisma.reader_document.update({ where: { id: secondId }, data: { orderKey: firstAccess.document.orderKey } }),
    ]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /reader/documents/:documentId/share-links
router.post("/:documentId/share-links", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "admin");
    if (!access) return;
    const expiresAtInput = req.body?.expiresAt;
    const expiresAt = expiresAtInput === undefined || expiresAtInput === null ? null : new Date(expiresAtInput);
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      res.status(400).json({ message: "expiresAt must be a valid ISO date" });
      return;
    }
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      res.status(400).json({ message: "expiresAt must be in the future" });
      return;
    }

    const token = createShareSecret();
    const link = await prisma.reader_document_share_link.create({
      data: {
        documentId: access.document.id,
        tokenHash: hashSecret(token),
        createdById: req.auth!.user.id,
        expiresAt,
      },
    });
    res.status(201).json({ id: link.id, token, expiresAt: link.expiresAt, createdAt: link.createdAt });
  } catch (error) {
    next(error);
  }
});

// DELETE /reader/documents/:documentId/share-links/:shareLinkId
router.delete("/:documentId/share-links/:shareLinkId", requireAuth, async (req, res, next) => {
  try {
    const access = await requireDocumentPermission(req, res, req.params.documentId, "admin");
    if (!access) return;
    const link = await prisma.reader_document_share_link.findFirst({
      where: { id: req.params.shareLinkId, documentId: access.document.id, revokedAt: null },
      select: { id: true },
    });
    if (!link) {
      res.status(404).json({ message: "Share link not found" });
      return;
    }
    await prisma.reader_document_share_link.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
