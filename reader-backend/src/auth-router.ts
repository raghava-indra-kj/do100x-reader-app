import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import {
  clearSessionCookie,
  createOpaqueToken,
  getSessionExpiry,
  hashToken,
  requireAuth,
  setSessionCookie,
} from "./auth";
import { prisma } from "./prisma";
import { ensurePersonalReaderHome } from "./reader-space";
import { migrateLegacyReaderDataForUser } from "./reader-document-migration";

const router = Router();

function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  return clientId;
}

function toCurrentUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  readerProfile: { homepageId: string | null } | null;
}, homepageId: string) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    homepageId,
  };
}

router.post("/google", async (req, res, next) => {
  const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
  if (!idToken) {
    res.status(400).json({ message: "A Google ID token is required" });
    return;
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: getGoogleClientId(),
    });
    const payload = ticket.getPayload();
    const emailVerified = payload?.email_verified === true || payload?.email_verified === "true";

    if (!payload?.sub || !payload.email || !emailVerified) {
      res.status(401).json({ message: "Google did not return a verified account identity" });
      return;
    }

    const displayName = payload.name?.trim() || payload.email;
    const avatarUrl = payload.picture?.trim() || null;
    let user = await prisma.user_account.findUnique({
      where: { googleSubject: payload.sub },
      include: { readerProfile: { select: { homepageId: true } } },
    });

    if (user) {
      user = await prisma.user_account.update({
        where: { id: user.id },
        data: { email: payload.email, displayName, avatarUrl },
        include: { readerProfile: { select: { homepageId: true } } },
      });
    } else {
      const now = new Date();
      user = await prisma.user_account.create({
        data: {
          googleSubject: payload.sub,
          email: payload.email,
          displayName,
          avatarUrl,
          readerProfile: { create: { homepageId: null, createdAt: now, updatedAt: now } },
        },
        include: { readerProfile: { select: { homepageId: true } } },
      });
    }

    await migrateLegacyReaderDataForUser(user);
    const homepageId = await ensurePersonalReaderHome(user.id);

    const token = createOpaqueToken();
    const expiresAt = getSessionExpiry();
    await prisma.$transaction([
      prisma.auth_session.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } }),
      prisma.auth_session.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt, createdAt: new Date() },
      }),
    ]);

    setSessionCookie(res, token);
    res.status(200).json(toCurrentUser(user, homepageId));
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_CLIENT_ID is not configured") {
      res.status(503).json({ message: "Google Sign-In has not been configured on the server" });
      return;
    }
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (req.auth!.user.homepageId) {
      res.json(req.auth!.user);
      return;
    }
    const user = await prisma.user_account.findUnique({
      where: { id: req.auth!.user.id },
      include: { readerProfile: { select: { homepageId: true } } },
    });
    if (!user) {
      res.status(401).json({ message: "Sign in is required" });
      return;
    }
    await migrateLegacyReaderDataForUser(user);
    const homepageId = await ensurePersonalReaderHome(user.id);
    res.json(toCurrentUser(user, homepageId));
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    if (req.auth) {
      await prisma.auth_session.delete({ where: { id: req.auth.sessionId } });
    }
    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// A long-lived, high-entropy token for MCP clients that cannot send the browser's HTTP-only cookie.
// Generating a new token invalidates the previous one, so it can be used as credential rotation.
router.post("/mcp-access-token", requireAuth, async (req, res, next) => {
  try {
    const token = createOpaqueToken("mcp_");
    await prisma.reader_mcp_access_token.upsert({
      where: { userId: req.auth!.user.id },
      update: { tokenHash: hashToken(token), createdAt: new Date() },
      create: { userId: req.auth!.user.id, tokenHash: hashToken(token), createdAt: new Date() },
    });
    res.status(201).json({ token });
  } catch (error) {
    next(error);
  }
});

export default router;
