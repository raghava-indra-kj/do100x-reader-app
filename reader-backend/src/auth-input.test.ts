import { describe, expect, it } from "vitest";
import { credentialsSchema } from "./auth-input";

describe("credentials input", () => {
  it("accepts longer credentials up to the database capacity", () => {
    expect(credentialsSchema.safeParse({ username: "reader.user@example.com", password: "a longer password" }).success).toBe(true);
    expect(credentialsSchema.safeParse({ username: "u".repeat(255), password: "p".repeat(255) }).success).toBe(true);
  });
  it.each([
    undefined, null, {}, { username: 123, password: "valid" },
    { username: " ", password: "valid" }, { username: "valid", password: " " },
    { username: "u".repeat(256), password: "valid" }, { username: "valid", password: "p".repeat(256) },
  ])("rejects invalid credentials before database access: %j", (input) => {
    expect(credentialsSchema.safeParse(input).success).toBe(false);
  });
});
