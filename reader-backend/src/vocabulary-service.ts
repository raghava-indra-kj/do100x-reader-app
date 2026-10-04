import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prisma";

export const difficultySchema = z.enum(["unrated", "easy", "medium", "difficult"]);
export const frequencySchema = z.enum(["unrated", "frequent", "occasional", "rare"]);
export const statusSchema = z.enum(["learning", "learned"]);
const instant = z.string().datetime({ offset: true });
export const vocabularyQuerySchema = z.object({
  search: z.string().trim().max(255).optional(),
  savedFrom: instant.optional(), savedBefore: instant.optional(),
  difficulty: difficultySchema.optional(), usageFrequency: frequencySchema.optional(),
  learningStatus: statusSchema.optional(), missingExplanation: z.boolean().optional(),
  sort: z.enum(["priority", "newest"]).default("priority"),
  offset: z.number().int().min(0).max(1000000).default(0),
  limit: z.number().int().min(1).max(50).default(50),
}).strict().refine(q => !q.savedFrom || !q.savedBefore || new Date(q.savedFrom) < new Date(q.savedBefore), {
  message: "The end of the date range must follow its start.",
});
export const addWordsSchema = z.object({
  words: z.array(z.string().trim().min(1).max(255)).min(1).max(50),
}).strict();
export const readWordsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).strict();
export const explanationBatchObject = z.object({
  words: z.array(z.object({
    id: z.string().uuid(), expectedVersion: z.number().int().positive(),
    explanationMarkdown: z.string().trim().min(1).max(20000),
  }).strict()).min(1).max(50),
}).strict();
export const explanationBatchSchema = explanationBatchObject.refine(input => new Set(input.words.map(w => w.id)).size === input.words.length, {
  message: "Include each word ID only once.",
}).refine(input => Buffer.byteLength(JSON.stringify(input), "utf8") <= 500000, {
  message: "Split explanations into batches smaller than 500 KB.",
});
export const wordUpdateObject = z.object({
  expectedVersion: z.number().int().positive(),
  difficulty: difficultySchema.optional(), usageFrequency: frequencySchema.optional(),
  learningStatus: statusSchema.optional(), practiceText: z.string().max(5000).optional(),
  reviewed: z.literal(true).optional(),
}).strict();
export const wordUpdateSchema = wordUpdateObject.refine(input => Object.entries(input).some(([key, value]) => key !== "expectedVersion" && value !== undefined), { message: "Choose a field to update." });
export type VocabularyQuery = z.input<typeof vocabularyQuerySchema>;
export class VocabularyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listVocabulary(userId: string, input: VocabularyQuery) {
  const q = vocabularyQuerySchema.parse(input);
  const where: Prisma.vocabularyWhereInput = {
    userId, ...(q.search ? { term: { contains: q.search } } : {}),
    difficulty: q.difficulty, usageFrequency: q.usageFrequency, learningStatus: q.learningStatus,
    ...(q.missingExplanation ? { explanationMarkdown: null } : {}),
    ...(q.savedFrom || q.savedBefore ? { createdAt: {
      ...(q.savedFrom ? { gte: new Date(q.savedFrom) } : {}),
      ...(q.savedBefore ? { lt: new Date(q.savedBefore) } : {}),
    } } : {}),
  };
  // MySQL ENUM ordering: learning first, difficult first, frequent before rare.
  const orderBy: Prisma.vocabularyOrderByWithRelationInput[] = q.sort === "newest"
    ? [{ createdAt: "desc" }, { id: "asc" }]
    : [{ learningStatus: "asc" }, { difficulty: "desc" }, { usageFrequency: "asc" }, { createdAt: "desc" }, { id: "asc" }];
  const [items, total] = await prisma.$transaction([
    prisma.vocabulary.findMany({ where, orderBy, skip: q.offset, take: q.limit, select: {
      id: true, term: true, difficulty: true, usageFrequency: true, learningStatus: true,
      lastReviewedAt: true, createdAt: true, updatedAt: true, version: true, explanationMarkdown: true,
    } }),
    prisma.vocabulary.count({ where }),
  ]);
  // Keep list responses small; complete lessons are fetched by exact ID.
  return { items: items.map(({ explanationMarkdown, ...word }) => ({ ...word, hasExplanation: Boolean(explanationMarkdown) })), total, nextOffset: q.offset + items.length < total ? q.offset + items.length : null };
}

export async function readVocabulary(userId: string, input: z.input<typeof readWordsSchema>) {
  const { ids } = readWordsSchema.parse(input);
  const rows = await prisma.vocabulary.findMany({ where: { userId, id: { in: ids } } });
  return ids.map(id => ({ id, word: rows.find(row => row.id === id) ?? null }));
}

export async function addVocabulary(userId: string, input: z.input<typeof addWordsSchema>) {
  const { words } = addWordsSchema.parse(input);
  const results = [];
  for (const term of words) {
    // Case is preserved. Do not stem or merge different forms.
    try {
      const word = await prisma.vocabulary.create({ data: { userId, term, normalizedTerm: term, practiceText: "" } });
      results.push({ word, created: true });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const word = await prisma.vocabulary.findUnique({ where: { userId_normalizedTerm: { userId, normalizedTerm: term } } });
      if (!word) throw error;
      results.push({ word, created: false });
    }
  }
  return results;
}

async function compareAndUpdate(userId: string, id: string, expectedVersion: number, data: Prisma.vocabularyUpdateManyMutationInput) {
  return prisma.$transaction(async tx => {
    const updated = await tx.vocabulary.updateMany({
      where: { id, userId, version: expectedVersion }, data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) {
      const exists = await tx.vocabulary.findFirst({ where: { id, userId }, select: { id: true } });
      throw new VocabularyError(exists ? 409 : 404, exists ? "This word changed. Reload it before saving again." : "Word not found.");
    }
    return tx.vocabulary.findFirstOrThrow({ where: { id, userId } });
  });
}

export async function writeExplanations(userId: string, input: z.input<typeof explanationBatchSchema>) {
  const { words } = explanationBatchSchema.parse(input);
  const results = [];
  for (const entry of words) {
    try {
      const word = await compareAndUpdate(userId, entry.id, entry.expectedVersion, { explanationMarkdown: entry.explanationMarkdown });
      results.push({ id: entry.id, status: "saved" as const, word });
    } catch (error) {
      if (error instanceof VocabularyError) results.push({ id: entry.id, status: error.status === 409 ? "conflict" as const : "not_found" as const, message: error.message });
      else results.push({ id: entry.id, status: "failed" as const, message: "Could not save this explanation. Read the word again before retrying." });
    }
  }
  return results;
}

export async function updateVocabulary(userId: string, id: string, input: z.input<typeof wordUpdateSchema>) {
  z.string().uuid().parse(id);
  const { expectedVersion, reviewed, ...data } = wordUpdateSchema.parse(input);
  return compareAndUpdate(userId, id, expectedVersion, { ...data, ...(reviewed ? { lastReviewedAt: new Date() } : {}) });
}

export async function deleteVocabulary(userId: string, id: string, expectedVersion: number) {
  z.string().uuid().parse(id); z.number().int().positive().parse(expectedVersion);
  const result = await prisma.vocabulary.deleteMany({ where: { id, userId, version: expectedVersion } });
  if (!result.count) {
    const exists = await prisma.vocabulary.findFirst({ where: { id, userId }, select: { id: true } });
    throw new VocabularyError(exists ? 409 : 404, exists ? "This word changed. Reload it before deleting." : "Word not found.");
  }
}
