import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPageTools } from "./tools/pages";
import { registerCommentTools } from "./tools/comments";
import { registerVocabularyTools } from "./tools/vocabulary";
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

  registerPageTools(server, userId);
  registerCommentTools(server, userId);
  registerVocabularyTools(server, userId);
  registerTaskTools(server, userId);
  registerResources(server, userId);
  registerPrompts(server, userId);

  return server;
}
