import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import meRouter from "./me";
import signupRouter from "./signup";
import pagesRouter from "./pages";
import commentsRouter from "./comments";

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDist = path.resolve(__dirname, "../../reader-frontend/dist");
const hasFrontend = fs.existsSync(path.join(frontendDist, "index.html"));

app.use(express.json());

if (hasFrontend) {
  app.use(express.static(frontendDist));
}

app.get("/backend-api/status", (_req, res) => {
  res.json({ success: true });
});
app.use("/backend-api/me", meRouter);
app.use("/backend-api/signup", signupRouter);
app.use("/backend-api/pages", pagesRouter);
app.use("/backend-api/comments", commentsRouter);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (hasFrontend) {
    console.log("Serving frontend from reader-frontend/dist");
  }
});
