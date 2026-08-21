import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import authRouter from "./auth-router";
import { attachAuth, requireAuth, requireTrustedOrigin } from "./auth";
import pagesRouter from "./pages";
import commentsRouter from "./comments";
import vocabularyRouter from "./vocabulary";
import modelConfigRouter from "./model-config";
import userModelsRouter from "./user-models";
import chatRouter from "./chat";
import tasksRouter from "./tasks";
import taskListsRouter from "./task-lists";
import timerRouter from "./timer";
import { createMcpSseRouter } from "./mcp/sse-router";

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDist = path.resolve(__dirname, "../../reader-frontend/dist");
const hasFrontend = fs.existsSync(path.join(frontendDist, "index.html"));

app.disable("x-powered-by");
app.use((_, res, next) => {
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' https://accounts.google.com/gsi/client",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "frame-src 'self' https:",
    "connect-src 'self' https://accounts.google.com/gsi/",
    "img-src 'self' data: https:",
  ].join("; "));
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use(express.json({ limit: '10mb' }));

// MCP Server Endpoints (SSE & Messages)
const mcpRouter = createMcpSseRouter();
app.use("/mcp", mcpRouter);
app.use("/", mcpRouter); // Also mount at root for standard http://localhost:3000/sse

if (hasFrontend) {
  app.use(express.static(frontendDist));
}

app.use("/backend-api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});
app.use("/backend-api", requireTrustedOrigin, attachAuth);

app.get("/backend-api/status", (_req, res) => {
  res.json({ success: true });
});
app.use("/backend-api/auth", authRouter);
app.use("/backend-api/pages", pagesRouter);
app.use("/backend-api/comments", requireAuth, commentsRouter);
app.use("/backend-api/vocabulary", requireAuth, vocabularyRouter);
app.use("/backend-api/model-config", requireAuth, modelConfigRouter);
app.use("/backend-api/user-models", requireAuth, userModelsRouter);
app.use("/backend-api/chat", requireAuth, chatRouter);
app.use("/backend-api/tasks", requireAuth, tasksRouter);
app.use("/backend-api/task-lists", requireAuth, taskListsRouter);
app.use("/backend-api/timer", requireAuth, timerRouter);

if (hasFrontend) {
  app.get("*splat", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled request error:", error);
  if (!res.headersSent) {
    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ message: "Malformed JSON request body" });
      return;
    }
    res.status(500).json({ message: "Unexpected server error" });
  }
});

process.title = `Reader App [Port ${PORT}]`;

app.listen(PORT, () => {
  console.log("\n=======================================================");
  console.log(`   READER APP SERVER RUNNING`);
  console.log(`   URL:      http://localhost:${PORT}`);
  console.log(`   PID:      ${process.pid}`);
  console.log(`   Frontend: ${hasFrontend ? "Unified (dist/)" : "API Mode"}`);
  console.log("=======================================================\n");
});
