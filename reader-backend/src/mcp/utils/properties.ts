import { prisma } from "../../prisma";

/**
 * Page column names that cannot be used as custom property keys.
 * These already exist as first-class fields on the `page` model.
 */
export const RESERVED_PROPERTY_KEYS = new Set([
  "id",
  "userId",
  "parentId",
  "parentPageId",
  "title",
  "content",
  "category",
  "sortOrder",
  "childrenCount",
  "isPublic",
  "meaningSystemPrompt",
  "explanationSystemPrompt",
  "doubtSystemPrompt",
  "createdAt",
  "updatedAt",
  "deletedAt",
]);

export interface PropertyKeyError {
  key: string;
  reason: string;
}

/**
 * Validates a custom property key. Returns an error descriptor or null when valid.
 */
export function validatePropertyKey(key: string): PropertyKeyError | null {
  if (typeof key !== "string" || !key.trim()) {
    return { key, reason: "Key must be a non-empty string" };
  }
  const trimmed = key.trim();
  if (trimmed.length > 255) {
    return { key, reason: "Key must be at most 255 characters" };
  }
  if (RESERVED_PROPERTY_KEYS.has(trimmed)) {
    return { key, reason: `Key "${trimmed}" is reserved (already a page field)` };
  }
  return null;
}

/**
 * Aggregates page_property rows into a `pageId -> { key: value }` map.
 * Single query for any number of pages (no N+1).
 */
export async function getPagePropertiesMap(
  userId: string,
  pageIds: string[]
): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>();
  if (pageIds.length === 0) return map;

  const rows = await prisma.page_property.findMany({
    where: { userId, pageId: { in: pageIds } },
    select: { pageId: true, key: true, value: true },
  });

  for (const row of rows) {
    let props = map.get(row.pageId);
    if (!props) {
      props = {};
      map.set(row.pageId, props);
    }
    props[row.key] = row.value;
  }

  return map;
}