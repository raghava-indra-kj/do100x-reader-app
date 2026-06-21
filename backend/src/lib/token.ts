import { randomBytes } from "crypto";

const SESSION_TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("hex");
}
