import { env } from "@core/config/env";
import { connectDatabase } from "@core/db/prisma";
import { logger } from "@core/infra/logger";
import { runShutdownHandlers } from "@core/infra/shutdown";
import { createApp } from "./app";

async function start(): Promise<void> {
    await connectDatabase();

    const app = createApp();
    const server = app.listen(env.server.port, () => {
        logger.info(`✓ http://localhost:${env.server.port}  [${env.appEnv}]`);
    });

    const shutdown = (signal: string) => {
        logger.warn(`${signal} — shutting down`);
        server.close(() => {
            runShutdownHandlers()
                .then(() => process.exit(0))
                .catch((err) => {
                    logger.error(err, "Failed to run shutdown handlers");
                    process.exit(1);
                });
        });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
    logger.error(err, "Failed to start server");
    process.exit(1);
});
