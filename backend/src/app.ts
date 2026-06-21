import "express-async-errors";
import express, { Express } from "express";
import { env } from "@core/config/env";
import { requestIdMiddleware } from "@core/http/request-id.middleware";
import { notFoundMiddleware } from "@core/http/not-found.middleware";
import { errorMiddleware } from "@core/http/error.middleware";

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: env.api.bodySizeLimit }));
  app.use(requestIdMiddleware);

  app.get(`${env.api.basePath}/status`, (_req, res) => {
    res.json({ success: true });
  });

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
