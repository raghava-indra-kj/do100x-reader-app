import "express-async-errors";
import express, { Express } from "express";
import { env } from "@core/config/env";
import { requestIdMiddleware } from "@core/http/request-id.middleware";
import { authMiddleware } from "@core/http/auth.middleware";
import { notFoundMiddleware } from "@core/http/not-found.middleware";
import { errorMiddleware } from "@core/http/error.middleware";
import { statusRouter } from "@modules/status/status.router";
import { authRouter } from "@modules/auth/auth.router";

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: env.api.bodySizeLimit }));
  app.use(requestIdMiddleware);
  app.use(authMiddleware);
  app.use(env.api.basePath, statusRouter);
  app.use(env.api.basePath, authRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
