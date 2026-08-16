import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import meRouter from "./me";
import signupRouter from "./signup";
import pagesRouter from "./pages";
import commentsRouter from "./comments";
import vocabularyRouter from "./vocabulary";
import modelConfigRouter from "./model-config";
import chatRouter from "./chat";
import tasksRouter from "./tasks";
import taskListsRouter from "./task-lists";
import timerRouter from "./timer";
import { createMcpSseRouter } from "./mcp/sse-router";

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDist = path.resolve(__dirname, "../../reader-frontend/dist");
const hasFrontend = fs.existsSync(path.join(frontendDist, "index.html"));

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

app.get("/backend-api/status", (_req, res) => {
  res.json({ success: true });
});
app.use("/backend-api/me", meRouter);
app.use("/backend-api/signup", signupRouter);
app.use("/backend-api/pages", pagesRouter);
app.use("/backend-api/comments", commentsRouter);
app.use("/backend-api/vocabulary", vocabularyRouter);
app.use("/backend-api/model-config", modelConfigRouter);
app.use("/backend-api/user-models", userModelsRouter);
app.use("/backend-api/chat", chatRouter);
app.use("/backend-api/tasks", tasksRouter);
app.use("/backend-api/task-lists", taskListsRouter);
app.use("/backend-api/timer", timerRouter);

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

process.title = `Reader App [Port ${PORT}]`;

app.listen(PORT, () => {
  console.log("\n=======================================================");
  console.log(`   READER APP SERVER RUNNING`);
  console.log(`   URL:      http://localhost:${PORT}`);
  console.log(`   PID:      ${process.pid}`);
  console.log(`   Frontend: ${hasFrontend ? "Unified (dist/)" : "API Mode"}`);
  console.log("=======================================================\n");
});
