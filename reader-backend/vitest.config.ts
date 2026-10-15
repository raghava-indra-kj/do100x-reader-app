import { defineConfig } from "vitest/config";
import { resolve } from 'node:path';
export default defineConfig({ resolve: { alias: { '@reader/md-ast': resolve(__dirname, '../packages/md-ast/src/index.ts') } }, test: { env: { GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com', SESSION_SECRET: 'test-only-session-signing-secret-at-least-32-chars', APP_ORIGINS: 'http://localhost:3000' }, include: ["src/**/*.test.ts"], maxWorkers: process.env.RUN_DATABASE_TESTS === "1" ? 1 : undefined } });
