import { Router, Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createReaderMcpServer } from "./server";
import { validateUserToken, AuthenticatedMcpUser } from "./user-context";

export function createMcpSseRouter(): Router {
  const router = Router();

  // CORS & Reverse Proxy Streaming Headers
  router.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id, x-mcp-token");
    res.setHeader("X-Accel-Buffering", "no"); // Disables Nginx response buffering for SSE
    res.setHeader("Cache-Control", "no-cache, no-transform");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Active transports and session user mappings
  const transports = new Map<string, SSEServerTransport>();
  const sessionUsers = new Map<string, AuthenticatedMcpUser>();

  function extractToken(req: Request): string | undefined {
    // 1. Path param (if /:token or /sse/:token)
    if (req.params.token) return req.params.token;

    // 2. Query param (?token=... or ?userId=... or ?key=...)
    if (typeof req.query.token === "string" && req.query.token) return req.query.token;
    if (typeof req.query.userId === "string" && req.query.userId) return req.query.userId;
    if (typeof req.query.key === "string" && req.query.key) return req.query.key;

    // 3. Headers (x-user-id, x-mcp-token, or Authorization: Bearer <token>)
    const xUserId = req.headers["x-user-id"];
    if (typeof xUserId === "string" && xUserId) return xUserId;

    const xMcpToken = req.headers["x-mcp-token"];
    if (typeof xMcpToken === "string" && xMcpToken) return xMcpToken;

    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      return auth.slice(7).trim();
    }

    return undefined;
  }

  async function handleSseConnect(req: Request, res: Response) {
    const token = extractToken(req);
    const user = await validateUserToken(token);

    if (!user) {
      res.status(401).json({
        error: "Unauthorized: Valid user identifier or secret token is required to connect to the Reader MCP server. No unauthenticated access permitted.",
      });
      return;
    }

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const postEndpoint = req.baseUrl ? `${req.baseUrl}/messages` : "/messages";
      const transport = new SSEServerTransport(postEndpoint, res);

      transports.set(transport.sessionId, transport);
      sessionUsers.set(transport.sessionId, user);

      req.on("close", () => {
        transports.delete(transport.sessionId);
        sessionUsers.delete(transport.sessionId);
      });

      // Instantiate server strictly locked to authenticated user
      const server = createReaderMcpServer(user.id);
      await server.connect(transport);
    } catch (err) {
      console.error(`MCP SSE connection error for user ${user.id}:`, err);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error initializing MCP SSE stream");
      }
    }
  }

  // SSE Connect Endpoints (specifically scoped to /sse and /sse/:token)
  router.get("/sse/:token", handleSseConnect);
  router.get("/sse", handleSseConnect);

  // POST /messages - Handles tool calls and client JSON-RPC messages for authenticated sessions
  router.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId query parameter is required" });
      return;
    }

    const transport = transports.get(sessionId);
    const user = sessionUsers.get(sessionId);

    if (!transport || !user) {
      res.status(401).json({
        error: `Unauthorized or expired MCP session for sessionId: ${sessionId}`,
      });
      return;
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error(`Error handling MCP message for session ${sessionId} (user: ${user.id}):`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process MCP message" });
      }
    }
  });

  return router;
}
