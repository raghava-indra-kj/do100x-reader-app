import { createHash, randomBytes } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma";

const SESSION_COOKIE_NAME = "reader_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  homepageId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        user: AuthenticatedUser;
      };
    }
  }
}

function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const key = pair.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken(prefix = ""): string {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function attachAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getCookie(req, SESSION_COOKIE_NAME);
    if (!token) {
      next();
      return;
    }

    const session = await prisma.auth_session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            readerProfile: { select: { homepageId: true } },
          },
        },
      },
    });

    if (!session) {
      clearSessionCookie(res);
      next();
      return;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.auth_session.delete({ where: { id: session.id } });
      clearSessionCookie(res);
      next();
      return;
    }

    req.auth = {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.avatarUrl,
        homepageId: session.user.readerProfile?.homepageId ?? null,
      },
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ message: "Sign in is required" });
    return;
  }
  next();
}

/**
 * Cookie-authenticated writes must originate from this application. SameSite=Lax
 * is the browser's first line of CSRF defence; this is an explicit second check.
 */
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  const configuredOrigins = (process.env.APP_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = `${req.protocol}://${req.get("host")}`;

  if (origin === requestOrigin || configuredOrigins.includes(origin)) {
    next();
    return;
  }

  res.status(403).json({ message: "Request origin is not allowed" });
}
