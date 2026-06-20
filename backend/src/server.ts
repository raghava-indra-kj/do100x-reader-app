import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 3000;

// Builds the app and starts listening.
function start(): void {
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Stops accepting new connections, then exits, so in-flight requests can finish.
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
