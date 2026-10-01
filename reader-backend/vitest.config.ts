import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/**/*.test.ts"], maxWorkers: process.env.RUN_DATABASE_TESTS === "1" ? 1 : undefined } });
