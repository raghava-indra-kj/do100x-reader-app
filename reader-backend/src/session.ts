import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response, RequestHandler } from "express";

const COOKIE = "reader_session";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const configuredSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error("SESSION_SECRET must contain at least 32 characters in production");
}
const secret = configuredSecret || randomBytes(32).toString("hex");

function sign(payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueSession(res: Response, userId: string): void {
  const payload = Buffer.from(JSON.stringify({ userId, expires: Date.now() + MAX_AGE })).toString("base64url");
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE, path: "/",
  });
}

export function readSession(req: Request): string | undefined {
  const token = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof value.userId === "string" && typeof value.expires === "number" && value.expires > Date.now()) return value.userId;
  } catch { /* Invalid cookies are unauthenticated. */ }
}

export const requireSession: RequestHandler = (req, res, next) => {
  const userId = readSession(req);
  if (!userId) { res.status(401).json({ message: "Please sign in again before editing pages" }); return; }
  // Cookie authentication must not accept cross-origin writes (including sibling subdomains).
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.get("host")) { res.status(403).json({ message: "Cross-origin page writes are not allowed" }); return; }
    } catch { res.status(403).json({ message: "Invalid request origin" }); return; }
  }
  res.locals.userId = userId;
  next();
};

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });
}
