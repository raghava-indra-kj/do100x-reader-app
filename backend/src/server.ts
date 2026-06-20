import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

function start(): void {
  const app = createApp();
  const server = app.listen(env.server.port, () => {
    logger.info(`✓ http://localhost:${env.server.port}  [${env.appEnv}]`);
  });
  const shutdown = (signal: string) => {
    logger.warn(`${signal} — shutting down`);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
