import { beforeEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("google-auth-library", () => ({ OAuth2Client: class { verifyIdToken = verify; } }));
import { verifyGoogleToken } from "./google";
const claims = { sub: "Google-subject", email: "reader@example.com", email_verified: true, name: "Reader", picture: "https://example.com/avatar.png", nonce: "challenge" };
beforeEach(() => { verify.mockReset(); });
describe("Google token verification adapter", () => {
  it("uses the official verifier with the configured audience, never just decodes a JWT", async () => {
    verify.mockResolvedValue({ getPayload: () => claims });
    expect(await verifyGoogleToken("signed-token")).toEqual({ subject: claims.sub, email: claims.email, displayName: "Reader", avatarUrl: claims.picture, nonce: "challenge" });
    expect(verify).toHaveBeenCalledWith({ idToken: "signed-token", audience: "test-client.apps.googleusercontent.com" });
  });
  it("propagates invalid, expired, wrong-audience, or untrusted token rejection", async () => {
    verify.mockRejectedValue(new Error("Invalid token"));
    await expect(verifyGoogleToken("token")).rejects.toThrow();
  });
  it.each([{ email_verified: false }, { sub: "" }, { sub: 42 }, { email: "" }, { email: 42 }, { nonce: undefined }, { nonce: "" }])("requires verified profile claims: %j", patch => {
    verify.mockResolvedValue({ getPayload: () => ({ ...claims, ...patch }) });
    return expect(verifyGoogleToken("token")).rejects.toThrow();
  });
  it("ignores unsafe picture URLs and permits missing optional profile fields", async () => {
    verify.mockResolvedValue({ getPayload: () => ({ ...claims, name: undefined, picture: "javascript:alert(1)" }) });
    expect(await verifyGoogleToken("token")).toMatchObject({ displayName: null, avatarUrl: null });
  });
});
