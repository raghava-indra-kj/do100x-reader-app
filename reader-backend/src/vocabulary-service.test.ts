import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  vocabulary: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), findFirstOrThrow: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./prisma", () => ({ prisma: db }));
import { addVocabulary, deleteVocabulary, explanationBatchSchema, listVocabulary, readVocabulary, updateVocabulary, vocabularyQuerySchema, writeExplanations } from "./vocabulary-service";

const a = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async input => Array.isArray(input) ? Promise.all(input) : input(db));
});
describe("personal vocabulary", () => {
  it("saves generic trimmed words without page context and preserves case", async () => {
    db.vocabulary.create.mockImplementation(async ({ data }) => ({ id: a, ...data }));
    const result = await addVocabulary("owner", { words: ["  US  ", "us"] });
    expect(result.map(r => r.word.term)).toEqual(["US", "us"]);
    expect(db.vocabulary.create).toHaveBeenCalledWith({ data: { userId: "owner", term: "US", normalizedTerm: "US", practiceText: "" } });
    await expect(addVocabulary("owner", { words: ["x"], pageId: a } as any)).rejects.toThrow();
  });
  it("repeated saves return the existing word without modifying progress", async () => {
    const existing = { id: a, term: "word", learningStatus: "learned", version: 8 };
    db.vocabulary.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
    db.vocabulary.findUnique.mockResolvedValue(existing);
    expect(await addVocabulary("owner", { words: ["word"] })).toEqual([{ word: existing, created: false }]);
    expect(db.vocabulary.updateMany).not.toHaveBeenCalled();
  });
  it("filters by owner and half-open saved-date boundaries with bounded pagination", async () => {
    db.vocabulary.findMany.mockResolvedValue([{ id: a }]); db.vocabulary.count.mockResolvedValue(4);
    const result = await listVocabulary("owner", { savedFrom: "2026-10-03T18:30:00Z", savedBefore: "2026-10-04T18:30:00Z", limit: 1, offset: 1, missingExplanation: true });
    expect(result).toEqual({ items: [{ id: a, hasExplanation: false }], total: 4, nextOffset: 2 });
    expect(db.vocabulary.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      userId: "owner", explanationMarkdown: null,
      createdAt: { gte: new Date("2026-10-03T18:30:00Z"), lt: new Date("2026-10-04T18:30:00Z") },
    }), take: 1, skip: 1 }));
    expect(vocabularyQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(vocabularyQuerySchema.safeParse({ savedFrom: "2026-10-05T00:00:00Z", savedBefore: "2026-10-04T00:00:00Z" }).success).toBe(false);
    expect(vocabularyQuerySchema.safeParse({ pageId: a }).success).toBe(false);
  });
  it("does not reveal inaccessible word records", async () => {
    db.vocabulary.findMany.mockResolvedValue([{ id: a, term: "mine" }]);
    expect(await readVocabulary("owner", { ids: [a, b] })).toEqual([{ id: a, word: { id: a, term: "mine" } }, { id: b, word: null }]);
    expect(db.vocabulary.findMany).toHaveBeenCalledWith({ where: { userId: "owner", id: { in: [a, b] } } });
  });
});
describe("batch explanations", () => {
  it("saves successful items even if another item's version conflicts", async () => {
    db.vocabulary.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    db.vocabulary.findFirst.mockResolvedValue({ id: a });
    db.vocabulary.findFirstOrThrow.mockResolvedValue({ id: b, version: 4, explanationMarkdown: "lesson" });
    const results = await writeExplanations("owner", { words: [
      { id: a, expectedVersion: 1, explanationMarkdown: "stale" },
      { id: b, expectedVersion: 3, explanationMarkdown: "lesson" },
    ] });
    expect(results.map(r => r.status)).toEqual(["conflict", "saved"]);
    expect(db.vocabulary.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: b, userId: "owner", version: 3 },
      data: { explanationMarkdown: "lesson", version: { increment: 1 } },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
  it("distinguishes inaccessible/deleted items from database failures and continues", async () => {
    db.vocabulary.updateMany.mockResolvedValueOnce({ count: 0 }).mockRejectedValueOnce(new Error("database unavailable"));
    db.vocabulary.findFirst.mockResolvedValue(null);
    const results = await writeExplanations("owner", { words: [
      { id: a, expectedVersion: 1, explanationMarkdown: "one" }, { id: b, expectedVersion: 1, explanationMarkdown: "two" },
    ] });
    expect(results.map(r => r.status)).toEqual(["not_found", "failed"]);
  });
  it("rejects malformed or duplicate entries before making any writes", async () => {
    const word = { id: a, expectedVersion: 1, explanationMarkdown: "lesson" };
    await expect(writeExplanations("owner", { words: [word, word] })).rejects.toThrow();
    await expect(writeExplanations("owner", { words: [{ ...word, explanationMarkdown: " " }] })).rejects.toThrow();
    await expect(writeExplanations("owner", { words: [{ ...word, practiceText: "overwrite" } as any] })).rejects.toThrow();
    expect(db.vocabulary.updateMany).not.toHaveBeenCalled();
  });
  it("bounds batch size, individual content and total UTF-8 size", () => {
    expect(explanationBatchSchema.safeParse({ words: Array.from({ length: 51 }, () => ({ id: a, expectedVersion: 1, explanationMarkdown: "x" })) }).success).toBe(false);
    expect(explanationBatchSchema.safeParse({ words: [{ id: a, expectedVersion: 1, explanationMarkdown: "x".repeat(20001) }] }).success).toBe(false);
    const words = Array.from({ length: 10 }, (_, n) => ({
      id: `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`, expectedVersion: 1, explanationMarkdown: "字".repeat(19000),
    }));
    expect(explanationBatchSchema.safeParse({ words }).success).toBe(false);
  });
});
describe("precise metadata and deletion", () => {
  it("requires a version and only writes requested metadata", async () => {
    db.vocabulary.updateMany.mockResolvedValue({ count: 1 }); db.vocabulary.findFirstOrThrow.mockResolvedValue({ id: a, version: 2 });
    await updateVocabulary("owner", a, { expectedVersion: 1, practiceText: "My sentence", reviewed: true });
    expect(db.vocabulary.updateMany).toHaveBeenCalledWith({ where: { id: a, userId: "owner", version: 1 }, data: { practiceText: "My sentence", lastReviewedAt: expect.any(Date), version: { increment: 1 } } });
    await expect(updateVocabulary("owner", a, { expectedVersion: 2, explanationMarkdown: "not metadata" } as any)).rejects.toThrow();
  });
  it("cannot delete a word with a stale version or another owner", async () => {
    db.vocabulary.deleteMany.mockResolvedValue({ count: 0 }); db.vocabulary.findFirst.mockResolvedValue(null);
    await expect(deleteVocabulary("owner", a, 2)).rejects.toMatchObject({ status: 404 });
    expect(db.vocabulary.deleteMany).toHaveBeenCalledWith({ where: { id: a, userId: "owner", version: 2 } });
    db.vocabulary.findFirst.mockResolvedValue({ id: a });
    await expect(deleteVocabulary("owner", a, 2)).rejects.toMatchObject({ status: 409 });
  });
});
