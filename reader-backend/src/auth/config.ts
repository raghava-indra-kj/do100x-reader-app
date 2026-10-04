import { z } from "zod";

const schema = z.object({
  GOOGLE_CLIENT_ID: z.string().regex(/^[\w-]+\.apps\.googleusercontent\.com$/, "GOOGLE_CLIENT_ID must be a Google web client ID"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must contain at least 32 characters"),
  APP_ORIGINS: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.parse(environment);
  const origins = parsed.APP_ORIGINS.split(",").map(value => value.trim());
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || url.username || url.password || url.hostname.includes("*") || !["http:", "https:"].includes(url.protocol)) throw new Error("APP_ORIGINS must contain exact HTTP(S) origins, without paths");
    if (parsed.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Production APP_ORIGINS must use HTTPS");
  }
  return { clientId: parsed.GOOGLE_CLIENT_ID, sessionSecret: parsed.SESSION_SECRET, origins, secureCookies: parsed.NODE_ENV === "production" };
}

export type AuthConfig = ReturnType<typeof loadAuthConfig>;
let configuration: AuthConfig | undefined;
export function authConfig(): AuthConfig { return configuration ??= loadAuthConfig(); }
