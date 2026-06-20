import express, { Express } from "express";

// Builds and returns the Express application with all middleware and routes attached.
export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));
  const apiPrefix = process.env.API_PREFIX || "/backend-api";
  app.get(`${apiPrefix}/status`, (_req, res) => {
    res.json({ success: true });
  });
  return app;
}
