import { OAuth2Client } from "google-auth-library";
import { authConfig } from "./config";

export interface GoogleProfile {
  subject: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  nonce: string;
}

export type VerifyGoogleToken = (credential: string) => Promise<GoogleProfile>;
const client = new OAuth2Client();
export const verifyGoogleToken: VerifyGoogleToken = async credential => {
  const ticket = await client.verifyIdToken({ idToken: credential, audience: authConfig().clientId });
  const payload = ticket.getPayload();
  const nonce = (payload as typeof payload & { nonce?: unknown })?.nonce;
  if (!payload || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255 || typeof payload.email !== "string" || !payload.email || payload.email.length > 320 || payload.email_verified !== true || typeof nonce !== "string" || !nonce) throw new Error("Google did not return a verified identity");
  const picture = payload.picture;
  return {
    subject: payload.sub, email: payload.email, displayName: typeof payload.name === "string" ? payload.name.slice(0, 255) || null : null,
    avatarUrl: typeof picture === "string" && URL.canParse(picture) && new URL(picture).protocol === "https:" ? picture : null,
    nonce,
  };
};
