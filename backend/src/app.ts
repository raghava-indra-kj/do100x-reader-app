import "express-async-errors";
import express, { Express } from "express";
import { env } from "@core/config/env";
import { requestIdMiddleware } from "@core/http/request-id.middleware";
import { errorMiddleware } from "@core/http/error.middleware";

export function createApp(): Express {
  const app = express();

  // Global middleware
  app.use(express.json({ limit: env.api.bodySizeLimit }));
  app.use(requestIdMiddleware);

  // Routes
  app.get(`${env.api.basePath}/status`, (_req, res) => {
    res.json({ success: true });
  });

  // Fallback & error handlers — must be last
  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });
  app.use(errorMiddleware);

  return app;
}
