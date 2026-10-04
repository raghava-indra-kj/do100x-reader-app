import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "./config";

const input = { GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com", SESSION_SECRET: "s".repeat(64), APP_ORIGINS: "http://localhost:3000,http://localhost:5173", NODE_ENV: "development" };
describe("Google authentication configuration", () => {
  it("supports the same public client ID for the backend and frontend", () => {
    const config = loadAuthConfig(input);
    expect(config.clientId).toBe(input.GOOGLE_CLIENT_ID);
    expect(config.origins).toEqual(["http://localhost:3000", "http://localhost:5173"]);
    expect(config.secureCookies).toBe(false);
  });
  it.each([
    { GOOGLE_CLIENT_ID: "" }, { SESSION_SECRET: "short" }, { APP_ORIGINS: "http://localhost:3000/path" },
    { APP_ORIGINS: "https://user:password@example.com" }, { APP_ORIGINS: "null" }, { APP_ORIGINS: "https://*.example.com" },
    { NODE_ENV: "production" },
  ])("rejects invalid or unsafe configuration: %j", patch => expect(() => loadAuthConfig({ ...input, ...patch })).toThrow());
  it("requires HTTPS and secure cookies in production", () => {
    expect(loadAuthConfig({ ...input, NODE_ENV: "production", APP_ORIGINS: "https://reader.example.com" }).secureCookies).toBe(true);
  });
});
