import express, { Express } from "express";
import { env } from "./config/env";

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: env.request.jsonLimit }));
  app.get(`${env.api.prefix}/status`, (_req, res) => {
    res.json({ success: true });
  });
  return app;
}
