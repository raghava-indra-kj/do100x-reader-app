import { randomUUID } from "node:crypto";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import { createSignupRouter } from "./signup";
import { createMeRouter } from "./me";

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("signs up and logs in with long credentials without leaving test rows", async () => {
  const db = new PrismaClient();
  const rollback = new Error("Signup fixture rollback");
  try {
    await db.$transaction(async (tx) => {
      const app = express();
      app.use(express.json());
      app.use("/signup", createSignupRouter(tx));
      app.use("/me", createMeRouter(tx));
      const server = app.listen(0, "127.0.0.1");
      try {
        await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No signup test port");
        const request = (path: string, body: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const usersBefore = await tx.appuser.count();
        const pagesBefore = await tx.page.count();
        for (const input of [{}, { username: 123, password: "valid" }, { username: "u".repeat(256), password: "valid" }, { username: "valid", password: "p".repeat(256) }]) {
          expect((await request("/signup", input)).status).toBe(422);
          expect((await request("/me", input)).status).toBe(422);
        }
        expect(await tx.appuser.count()).toBe(usersBefore);
        expect(await tx.page.count()).toBe(pagesBefore);

        const credentials = { username: (randomUUID() + "@example.com").padEnd(255, "u"), password: "p".repeat(255) };
        const signup = await request("/signup", credentials);
        expect(signup.status).toBe(201);
        expect(signup.headers.get("set-cookie")).toContain("reader_session=");
        const user = await signup.json();
        expect(user.username).toBe(credentials.username);
        expect((await tx.appuser.findUniqueOrThrow({ where: { id: user.id } })).password).toBe(credentials.password);
        expect((await tx.page.findUniqueOrThrow({ where: { id: user.homepageId } })).userId).toBe(user.id);
        expect((await request("/signup", credentials)).status).toBe(409);
        const login = await request("/me", credentials);
        expect(login.status).toBe(200);
        expect((await login.json()).id).toBe(user.id);
        expect((await request("/me", { ...credentials, password: "wrong" })).status).toBe(401);

        const legacy = { username: `u${randomUUID().slice(0, 12)}`, password: "0000" };
        expect((await request("/signup", legacy)).status).toBe(201);
        expect((await request("/me", legacy)).status).toBe(200);
      } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      throw rollback;
    }, { timeout: 20_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally { await db.$disconnect(); }
});
