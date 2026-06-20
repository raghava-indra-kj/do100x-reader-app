import express, { Express } from "express";
import i18next from "i18next";
import { handle } from "i18next-http-middleware";
import { env } from "./config/env";
export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: env.request.jsonLimit }));
  app.use(handle(i18next));

  app.get(`${env.api.prefix}/status`, (_req, res) => {
    res.json({ success: true });
  });

  return app;
}
