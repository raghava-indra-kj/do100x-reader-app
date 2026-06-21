import express, { Express } from "express";
import i18next from "i18next";
import { handle } from "i18next-http-middleware";
import { env } from "./config/env";
import { commonNamespace } from "./common/i18n/namespaces";

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: env.api.bodySizeLimit }));
  app.use(handle(i18next));

  app.get(`${env.api.basePath}/status`, (_req, res) => {
    res.json({ success: true });
  });

  app.use((req, res) => {
    res.status(404).json({ message: req.t("common.notFound", { ns: commonNamespace }) });
  });

  return app;
}
