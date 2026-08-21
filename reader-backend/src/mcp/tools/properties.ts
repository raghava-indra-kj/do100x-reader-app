import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";
import { getPagePropertiesMap, validatePropertyKey } from "../utils/properties";

export function registerPropertyTools(server: McpServer, userId: string) {
  // 1. Get page properties
  server.tool(
    "reader_get_page_properties",
    "Get all custom properties (key/value pairs) for a reader page, optionally filtered to specific keys",
    {
      pageId: z.string().describe("The UUID of the page to read properties from"),
      keys: z.array(z.string()).optional().describe("Optional list of property keys to return (omit for all)"),
    },
    async ({ pageId, keys }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
        select: { id: true },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      const map = await getPagePropertiesMap(userId, [pageId]);
      const all = map.get(pageId) ?? {};

      const properties = keys && keys.length > 0
        ? Object.fromEntries(keys.map((k) => [k, all[k]]).filter(([, v]) => v !== undefined))
        : all;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                pageId,
                propertyCount: Object.keys(properties).length,
                properties,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 2. Set page properties (upsert)
  server.tool(
    "reader_set_page_properties",
    "Set custom properties (key/value pairs) on a reader page. Keys are upserted; use mode='replace' to clear all other properties first.",
    {
      pageId: z.string().describe("The UUID of the page to write properties to"),
      properties: z.record(z.string()).describe("Object of key/value properties to set (e.g. { \"description\": \"...\", \"prompt:content\": \"...\" })"),
      mode: z.enum(["merge", "replace"]).optional().describe("'merge' keeps existing keys (default), 'replace' deletes all other keys first"),
    },
    async ({ pageId, properties, mode }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
        select: { id: true },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      const entries = Object.entries(properties);
      if (entries.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "properties must contain at least one key/value pair" }],
        };
      }

      const errors = entries
        .map(([key]) => validatePropertyKey(key))
        .filter((e): e is { key: string; reason: string } => e !== null);

      if (errors.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid property key(s): ${errors.map((e) => `"${e.key}" (${e.reason})`).join(", ")}`,
            },
          ],
        };
      }

      const now = new Date();

      if (mode === "replace") {
        await prisma.page_property.deleteMany({
          where: {
            userId,
            pageId,
            key: { notIn: entries.map(([key]) => key.trim()) },
          },
        });
      }

      for (const [key, value] of entries) {
        await prisma.page_property.upsert({
          where: { pageId_key: { pageId, key: key.trim() } },
          update: { value, updatedAt: now },
          create: {
            pageId,
            userId,
            key: key.trim(),
            value,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      const map = await getPagePropertiesMap(userId, [pageId]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                pageId,
                mode: mode ?? "merge",
                writtenKeys: entries.map(([key]) => key.trim()),
                properties: map.get(pageId) ?? {},
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 3. Delete page properties
  server.tool(
    "reader_delete_page_properties",
    "Delete one or more custom properties from a reader page",
    {
      pageId: z.string().describe("The UUID of the page to delete properties from"),
      keys: z.array(z.string()).describe("List of property keys to remove"),
    },
    async ({ pageId, keys }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
        select: { id: true },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      if (!keys || keys.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "keys must contain at least one property key" }],
        };
      }

      const cleanKeys = keys.map((k) => k.trim()).filter(Boolean);

      const result = await prisma.page_property.deleteMany({
        where: {
          userId,
          pageId,
          key: { in: cleanKeys },
        },
      });

      const map = await getPagePropertiesMap(userId, [pageId]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                pageId,
                deletedCount: result.count,
                deletedKeys: cleanKeys,
                properties: map.get(pageId) ?? {},
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 4. Search pages by property
  server.tool(
    "reader_search_pages_by_property",
    "Find reader pages that have a given custom property key, optionally matching a specific value",
    {
      key: z.string().describe("Property key to search for (e.g. 'description')"),
      value: z.string().optional().describe("Optional exact value to filter by"),
      limit: z.number().optional().describe("Max results to return (default: 20)"),
    },
    async ({ key, value, limit = 20 }) => {
      const rows = await prisma.page_property.findMany({
        where: {
          userId,
          key: key.trim(),
          ...(value !== undefined ? { value } : {}),
        },
        select: { pageId: true, key: true, value: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });

      const pageIds = rows.map((r) => r.pageId);
      const pages = await prisma.page.findMany({
        where: { id: { in: pageIds }, userId, deletedAt: null },
        select: { id: true, title: true },
      });
      const pageTitleMap = new Map(pages.map((p) => [p.id, p.title]));

      const results = rows
        .filter((r) => pageTitleMap.has(r.pageId))
        .map((r) => ({
          pageId: r.pageId,
          title: pageTitleMap.get(r.pageId),
          value: r.value,
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ key, totalResults: results.length, results }, null, 2),
          },
        ],
      };
    }
  );
}