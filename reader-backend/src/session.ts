import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, RequestHandler } from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { authConfig } from "./auth/config";

const COOKIE = "reader_session";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const authenticatedUsers = new WeakMap<Request, string>();

function sign(payload: string): string {
  return createHmac("sha256", authConfig().sessionSecret).update(payload).digest("base64url");
}

export function readCookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function issueSession(res: Response, userId: string): void {
  const payload = Buffer.from(JSON.stringify({ version: 2, userId, expires: Date.now() + MAX_AGE })).toString("base64url");
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "strict", secure: authConfig().secureCookies, maxAge: MAX_AGE, path: "/",
  });
}

function decodeSession(req: Request): string | undefined {
  const token = readCookie(req, COOKIE);
  if (!token) return;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (value.version === 2 && typeof value.userId === "string" && typeof value.expires === "number" && value.expires > Date.now()) return value.userId;
  } catch { /* Invalid cookies are unauthenticated. */ }
}

export function attachSession(db: PrismaClient | Prisma.TransactionClient = prisma): RequestHandler {
  return async (req, res, next) => {
    try {
      const userId = decodeSession(req);
      if (userId) {
        const identity = await db.auth_identity.findUnique({ where: { userId_provider: { userId, provider: "GOOGLE" } }, select: { userId: true } });
        if (identity) authenticatedUsers.set(req, identity.userId);
        else clearSession(res);
      }
      next();
    } catch (error) { next(error); }
  };
}

export function readSession(req: Request): string | undefined { return authenticatedUsers.get(req); }

export const requireTrustedOrigin: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !authConfig().origins.includes(origin)) {
    res.status(403).json({ message: "This request came from an address that isn’t allowed." });
    return;
  }
  next();
};

export const requireSession: RequestHandler = (req, res, next) => {
  const userId = readSession(req);
  if (!userId) { res.status(401).json({ message: "Sign in with Google to continue." }); return; }
  res.locals.userId = userId;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) return requireTrustedOrigin(req, res, next);
  next();
};

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", secure: authConfig().secureCookies, path: "/" });
}
