import { createApp } from "./app";
import { env } from "./core/config/env";
import { initI18n } from "./common/i18n/i18n";
import { connectDatabase, disconnectDatabase } from "./core/db/prisma";
import { logger } from "./lib/logger";

async function start(): Promise<void> {
  await initI18n();
  await connectDatabase();
  logger.info("database connected");

  const app = createApp();
  const server = app.listen(env.server.port, () => {
    logger.info(`✓ http://localhost:${env.server.port}  [${env.appEnv}]`);
  });

  const shutdown = (signal: string) => {
    logger.warn(`${signal} — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});
