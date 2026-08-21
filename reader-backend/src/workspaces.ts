import { Router } from "express";
import { requireAuth } from "./auth";
import { prisma } from "./prisma";
import { roleAllows, type ReaderRole } from "./reader-space";

const router = Router();
const ASSIGNABLE_ROLES = new Set(["admin", "editor", "viewer"]);

function toRole(role: string): ReaderRole {
  return role === "owner" || role === "admin" || role === "editor" || role === "viewer" ? role : "viewer";
}

async function requireWorkspaceRole({
  workspaceId,
  userId,
  required,
}: {
  workspaceId: string;
  userId: string;
  required: Exclude<ReaderRole, "none">;
}) {
  const membership = await prisma.workspace_member.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, workspace: { select: { id: true, deletedAt: true } } },
  });
  if (!membership || membership.workspace.deletedAt || !roleAllows(toRole(membership.role), required)) return null;
  return toRole(membership.role);
}

function canManageRole(actor: ReaderRole, target: string): boolean {
  if (!ASSIGNABLE_ROLES.has(target)) return false;
  if (actor === "owner") return true;
  return actor === "admin" && (target === "editor" || target === "viewer");
}

// GET /workspaces gives the frontend a stable workspace/Reader-space picker.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const memberships = await prisma.workspace_member.findMany({
      where: { userId: req.auth!.user.id, workspace: { deletedAt: null } },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            kind: true,
            name: true,
            personalOwnerId: true,
            createdAt: true,
            readerSpace: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json(memberships.map(({ role, workspace }) => ({
      id: workspace.id,
      kind: workspace.kind,
      name: workspace.name,
      role: toRole(role),
      isPersonal: workspace.personalOwnerId === req.auth!.user.id,
      createdAt: workspace.createdAt,
      readerSpace: workspace.readerSpace,
    })));
  } catch (error) {
    next(error);
  }
});

// POST /workspaces creates an application-neutral team workspace and its
// Reader installation. Future apps can add their own app space to this same
// workspace without changing account or membership records.
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 255) {
      res.status(400).json({ message: "name must be between 1 and 255 characters" });
      return;
    }
    const workspace = await prisma.workspace.create({
      data: {
        kind: "team",
        name,
        createdById: req.auth!.user.id,
        members: { create: { userId: req.auth!.user.id, role: "owner" } },
        readerSpace: { create: { name: "Reader" } },
      },
      select: { id: true, name: true, kind: true, readerSpace: { select: { id: true, name: true } } },
    });
    res.status(201).json({ ...workspace, role: "owner" });
  } catch (error) {
    next(error);
  }
});

// GET /workspaces/:workspaceId/members
router.get("/:workspaceId/members", requireAuth, async (req, res, next) => {
  try {
    const actorRole = await requireWorkspaceRole({
      workspaceId: req.params.workspaceId,
      userId: req.auth!.user.id,
      required: "admin",
    });
    if (!actorRole) {
      res.status(404).json({ message: "Workspace not found" });
      return;
    }
    const members = await prisma.workspace_member.findMany({
      where: { workspaceId: req.params.workspaceId },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { email: true, displayName: true, avatarUrl: true } },
      },
    });
    res.json(members.map((member) => ({
      userId: member.userId,
      role: toRole(member.role),
      createdAt: member.createdAt,
      email: member.user.email,
      displayName: member.user.displayName,
      avatarUrl: member.user.avatarUrl,
    })));
  } catch (error) {
    next(error);
  }
});

// PUT /workspaces/:workspaceId/members accepts an existing Google account by
// email. Email invitations can be layered on this deterministic membership API
// once an email delivery provider is selected.
router.put("/:workspaceId/members", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const role = typeof req.body?.role === "string" ? req.body.role : "";
    const actorRole = await requireWorkspaceRole({ workspaceId, userId: req.auth!.user.id, required: "admin" });
    if (!actorRole) {
      res.status(404).json({ message: "Workspace not found" });
      return;
    }
    if (!email || !canManageRole(actorRole, role)) {
      res.status(403).json({ message: "You cannot assign that workspace role" });
      return;
    }
    const user = await prisma.user_account.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, avatarUrl: true },
    });
    if (!user) {
      res.status(404).json({ message: "That person must sign in with Google before they can be added" });
      return;
    }
    const existing = await prisma.workspace_member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      select: { role: true },
    });
    if (existing?.role === "owner") {
      res.status(403).json({ message: "The workspace owner role cannot be changed here" });
      return;
    }
    const member = await prisma.workspace_member.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: { role },
      create: { workspaceId, userId: user.id, role },
      select: { userId: true, role: true, createdAt: true },
    });
    res.status(200).json({ ...member, role: toRole(member.role), email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl });
  } catch (error) {
    next(error);
  }
});

// DELETE /workspaces/:workspaceId/members/:userId
router.delete("/:workspaceId/members/:userId", requireAuth, async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId;
    const actorRole = await requireWorkspaceRole({ workspaceId, userId: req.auth!.user.id, required: "admin" });
    if (!actorRole) {
      res.status(404).json({ message: "Workspace not found" });
      return;
    }
    const member = await prisma.workspace_member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.params.userId } },
      select: { role: true },
    });
    if (!member) {
      res.status(404).json({ message: "Workspace member not found" });
      return;
    }
    if (member.role === "owner" || !canManageRole(actorRole, member.role)) {
      res.status(403).json({ message: "You cannot remove that workspace member" });
      return;
    }
    await prisma.workspace_member.delete({ where: { workspaceId_userId: { workspaceId, userId: req.params.userId } } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
