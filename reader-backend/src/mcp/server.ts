import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTaskTools } from "./tools/tasks";
import { registerResources } from "./resources";
import { registerPrompts } from "./prompts";

/**
 * Creates and configures a new McpServer instance with all Reader tools,
 * resources, and prompt templates registered and locked to the authenticated user.
 */
export function createReaderMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "reader-app",
    version: "1.0.0",
  });

  // Legacy Reader MCP tools mutate the retired page/EAV tables. Do not expose
  // a second write path while Reader is revisioned and workspace-scoped; that
  // would silently fork data from the browser. A document-native MCP surface
  // will be introduced under a new, concurrency-aware contract.
  server.tool(
    "reader_document_api_migration_status",
    "Explain the Reader document API migration status and how to continue safely.",
    {},
    async () => ({
      content: [{
        type: "text",
        text: "Reader now stores Markdown in workspace-scoped, versioned documents. Legacy Reader MCP page/property/comment/vocabulary tools are temporarily unavailable so they cannot write stale legacy tables. Use the authenticated Reader web app while the document-native MCP tools are rolled out; task tools remain available.",
      }],
    }),
  );
  registerTaskTools(server, userId);
  registerResources(server, userId);
  registerPrompts(server, userId);

  return server;
}
