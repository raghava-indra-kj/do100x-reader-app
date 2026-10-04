import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { clearSession, issueSession, readCookie, readSession, requireTrustedOrigin } from "../session";
import { authConfig } from "./config";
import { verifyGoogleToken, type VerifyGoogleToken, type GoogleProfile } from "./google";

const CHALLENGE_COOKIE = "reader_login_challenge";
const CHALLENGE_AGE = 5 * 60 * 1000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const inputSchema = z.object({ credential: z.string().min(1).max(16384) }).strict();
const profileSelection = { id: true, displayName: true, email: true, avatarUrl: true } as const;

export function createAuthRouter(db: PrismaClient = prisma, verify: VerifyGoogleToken = verifyGoogleToken) {
  const router = Router();
  router.get("/config", (_req, res) => res.json({ googleClientId: authConfig().clientId }));
  router.get("/challenge", async (_req, res) => {
    const id = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    await db.auth_login_challenge.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await db.auth_login_challenge.create({ data: { idHash: hash(id), nonceHash: hash(nonce), expiresAt: new Date(Date.now() + CHALLENGE_AGE) } });
    res.cookie(CHALLENGE_COOKIE, id, { httpOnly: true, secure: authConfig().secureCookies, sameSite: "strict", path: "/backend-api/auth", maxAge: CHALLENGE_AGE });
    res.json({ nonce });
  });
  router.post("/google", requireTrustedOrigin, async (req, res) => {
    const input = inputSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ message: "Couldn’t complete Google sign-in. Try again." }); return; }
    const challengeId = readCookie(req, CHALLENGE_COOKIE);
    const csrf = req.get("x-login-csrf");
    if (!challengeId || !csrf) { res.status(403).json({ message: "Please start Google sign-in again." }); return; }
    const challenge = await db.auth_login_challenge.findUnique({ where: { idHash: hash(challengeId) } });
    if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.nonceHash !== hash(csrf)) { res.status(403).json({ message: "Sign-in expired. Please start again." }); return; }
    let profile: GoogleProfile;
    try { profile = await verify(input.data.credential); }
    catch { res.status(401).json({ message: "Couldn’t verify Google sign-in. Please start again." }); return; }
    if (hash(profile.nonce) !== challenge.nonceHash) { res.status(403).json({ message: "Couldn’t verify this sign-in. Please start again." }); return; }
    // Challenge consumption and account provisioning are atomic. Unique identities
    // and bounded retries handle separate concurrent first sign-ins safely.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const user = await db.$transaction(async tx => {
          const consumed = await tx.auth_login_challenge.deleteMany({ where: { idHash: challenge.idHash, nonceHash: challenge.nonceHash, expiresAt: { gt: new Date() } } });
          if (consumed.count !== 1) return null;
          const identity = await tx.auth_identity.findUnique({ where: { provider_providerSubject: { provider: "GOOGLE", providerSubject: profile.subject } } });
          const data = { displayName: profile.displayName, email: profile.email, avatarUrl: profile.avatarUrl };
          if (identity) return tx.appuser.update({ where: { id: identity.userId }, data, select: profileSelection });
          return tx.appuser.create({ data: { ...data, identities: { create: { provider: "GOOGLE", providerSubject: profile.subject } } }, select: profileSelection });
        });
        if (!user) { res.status(403).json({ message: "Please start a new Google sign-in." }); return; }
        res.clearCookie(CHALLENGE_COOKIE, { httpOnly: true, secure: authConfig().secureCookies, sameSite: "strict", path: "/backend-api/auth" });
        issueSession(res, user.id);
        res.json(user);
        return;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (attempt === 2 || !["P2002", "P2034"].includes(code ?? "")) throw error;
      }
    }
  });
  router.get("/session", async (req, res) => {
    const userId = readSession(req);
    if (!userId) { res.status(401).json({ message: "Sign in to continue." }); return; }
    const user = await db.appuser.findUnique({ where: { id: userId }, select: profileSelection });
    if (!user) { clearSession(res); res.status(401).json({ message: "Sign in to continue." }); return; }
    res.json(user);
  });
  router.post("/logout", requireTrustedOrigin, (_req, res) => { clearSession(res); res.status(204).send(); });
  return router;
}
