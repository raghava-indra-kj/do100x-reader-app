import { createHash, randomUUID } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export type ReaderRole = "owner" | "admin" | "editor" | "viewer" | "none";

export interface ReaderSpaceContext {
  readerSpaceId: string;
  workspaceId: string;
  role: ReaderRole;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

const ROLE_WEIGHT: Record<ReaderRole, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function roleAllows(role: ReaderRole, required: Exclude<ReaderRole, "none">): boolean {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[required];
}

function normalizeWorkspaceRole(role: string): ReaderRole {
  if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return "none";
}

/**
 * Creates exactly one personal workspace and Reader installation for an account.
 * The unique personalOwnerId constraint makes this safe when two first-login
 * requests arrive at the same time.
 */
export async function ensurePersonalReaderSpace(userId: string): Promise<ReaderSpaceContext> {
  const existing = await prisma.workspace.findUnique({
    where: { personalOwnerId: userId },
    include: { readerSpace: true },
  });

  if (existing?.readerSpace) {
    return { readerSpaceId: existing.readerSpace.id, workspaceId: existing.id, role: "owner" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user_account.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      if (!user) throw new Error("Cannot create a Reader space for an unknown account");

      const workspace = await tx.workspace.upsert({
        where: { personalOwnerId: userId },
        update: {},
        create: {
          kind: "personal",
          name: `${user.displayName || "Personal"}'s workspace`,
          createdById: userId,
          personalOwnerId: userId,
          members: { create: { userId, role: "owner" } },
        },
        include: { readerSpace: true },
      });

      const readerSpace = workspace.readerSpace ?? await tx.reader_space.create({
        data: { workspaceId: workspace.id, name: "Reader" },
      });

      return { readerSpaceId: readerSpace.id, workspaceId: workspace.id, role: "owner" };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    // A competing first-login request can win the unique insert. Read the
    // settled workspace once before surfacing an actual database failure.
    const settled = await prisma.workspace.findUnique({
      where: { personalOwnerId: userId },
      include: { readerSpace: true },
    });
    if (settled?.readerSpace) {
      return { readerSpaceId: settled.readerSpace.id, workspaceId: settled.id, role: "owner" };
    }
    throw error;
  }
}

export async function getReaderSpaceContext(
  db: DbClient,
  readerSpaceId: string,
  userId: string,
): Promise<ReaderSpaceContext | null> {
  const space = await db.reader_space.findUnique({
    where: { id: readerSpaceId },
    select: { id: true, workspaceId: true, workspace: { select: { deletedAt: true } } },
  });
  if (!space || space.workspace.deletedAt) return null;

  const membership = await db.workspace_member.findUnique({
    where: { workspaceId_userId: { workspaceId: space.workspaceId, userId } },
    select: { role: true },
  });
  if (!membership) return null;

  return {
    readerSpaceId: space.id,
    workspaceId: space.workspaceId,
    role: normalizeWorkspaceRole(membership.role),
  };
}

/** Creates the initial empty document for a personal Reader space exactly once. */
export async function ensurePersonalReaderHome(userId: string): Promise<string> {
  const context = await ensurePersonalReaderSpace(userId);

  return prisma.$transaction(async (tx) => {
    await tx.reader_member_preference.upsert({
      where: { readerSpaceId_userId: { readerSpaceId: context.readerSpaceId, userId } },
      update: {},
      create: { readerSpaceId: context.readerSpaceId, userId, homeDocumentId: null },
    });
    const preference = await tx.reader_member_preference.findUnique({
      where: { readerSpaceId_userId: { readerSpaceId: context.readerSpaceId, userId } },
      select: { homeDocumentId: true },
    });
    if (preference?.homeDocumentId) {
      const existingHome = await tx.reader_document.findFirst({
        where: { id: preference.homeDocumentId, readerSpaceId: context.readerSpaceId, deletedAt: null },
        select: { id: true },
      });
      if (existingHome) return existingHome.id;
    }

    const documentId = randomUUID();
    const revisionId = randomUUID();
    const markdown = "";
    await tx.reader_document.create({
      data: {
        id: documentId,
        readerSpaceId: context.readerSpaceId,
        title: "Home",
        orderKey: "0000000000-home",
        currentRevisionNumber: 1,
        headRevisionId: revisionId,
        createdById: userId,
        updatedById: userId,
        revisions: {
          create: {
            id: revisionId,
            revisionNumber: 1,
            markdown,
            contentHash: createHash("sha256").update(markdown, "utf8").digest("hex"),
            formatVersion: "reader-markdown-v1",
            createdById: userId,
          },
        },
      },
    });
    const claimedHome = await tx.reader_member_preference.updateMany({
      where: { readerSpaceId: context.readerSpaceId, userId, homeDocumentId: null },
      data: { homeDocumentId: documentId },
    });
    if (claimedHome.count === 1) return documentId;

    // Another request claimed the preference while this empty document was
    // being prepared. It is safe to remove this never-exposed provisional row.
    await tx.reader_document.delete({ where: { id: documentId } });
    const settled = await tx.reader_member_preference.findUnique({
      where: { readerSpaceId_userId: { readerSpaceId: context.readerSpaceId, userId } },
      select: { homeDocumentId: true },
    });
    if (!settled?.homeDocumentId) throw new Error("Unable to establish a Reader home document");
    return settled.homeDocumentId;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
