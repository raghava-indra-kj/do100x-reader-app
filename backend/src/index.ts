import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import { AppError } from "./errors";
import { INTERNAL_ERROR } from "./error-codes";
import authRouter from "./routes/auth";
import pagesRouter from "./routes/pages";

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDist = path.resolve(__dirname, "../../reader-frontend/dist");
const hasFrontend = fs.existsSync(path.join(frontendDist, "index.html"));
const isDev = process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------------------
// Body parser
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT", message: "Too many requests. Try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT", message: "Too many auth requests. Try again later." },
});

app.use("/backend-api", globalLimiter);
app.use("/backend-api/auth", authLimiter);

// ---------------------------------------------------------------------------
// Static frontend serving
// ---------------------------------------------------------------------------
if (hasFrontend) {
  app.use(express.static(frontendDist));
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.get("/backend-api/status", (_req, res) => {
  res.json({ success: true });
});

app.use("/backend-api/auth", authRouter);
app.use("/backend-api/pages", pagesRouter);

// ---------------------------------------------------------------------------
// Frontend catch-all (SPA routing)
// ---------------------------------------------------------------------------
if (hasFrontend) {
  app.get("*splat", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        ...(isDev ? { stack: err.stack } : {}),
      });
    } else {
      console.error(err);
      res.status(500).json({
        code: INTERNAL_ERROR,
        message: "Something went wrong. Please try again.",
        ...(isDev ? { stack: err?.stack } : {}),
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Process-level error handlers
// ---------------------------------------------------------------------------
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (hasFrontend) {
    console.log("Serving frontend from reader-frontend/dist");
  }
});
