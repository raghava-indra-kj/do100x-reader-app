import "express-async-errors";
import express, { Express } from "express";
import { env } from "@core/config/env";

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: env.api.bodySizeLimit }));

  app.get(`${env.api.basePath}/status`, (_req, res) => {
    res.json({ success: true });
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return app;
}
