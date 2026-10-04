import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addVocabulary, addWordsSchema, deleteVocabulary, difficultySchema, explanationBatchObject, frequencySchema, listVocabulary, readVocabulary, readWordsSchema, statusSchema, updateVocabulary, VocabularyError, wordUpdateObject, writeExplanations } from "../../vocabulary-service";

const result = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
async function call(fn: () => Promise<unknown>) {
  try { return result(await fn()); }
  catch (error) {
    return { isError: true, ...result({ message: error instanceof z.ZodError ? error.issues.map(i => i.message).join(" ") : error instanceof VocabularyError ? error.message : "Vocabulary operation failed." }) };
  }
}
export function registerVocabularyTools(server: McpServer, userId: string) {
  server.tool("reader_get_vocabulary", "List personal learning words. Dates are ISO instants: savedFrom inclusive, savedBefore exclusive. Convert local calendar boundaries to instants. Use missingExplanation to prepare lessons in batches.", {
    search: z.string().optional(), savedFrom: z.string().optional(), savedBefore: z.string().optional(),
    difficulty: difficultySchema.optional(), usageFrequency: frequencySchema.optional(), learningStatus: statusSchema.optional(),
    missingExplanation: z.boolean().optional(), sort: z.enum(["priority", "newest"]).optional(),
    offset: z.number().int().optional(), limit: z.number().int().optional(),
  }, input => call(() => listVocabulary(userId, input)));
  server.tool("reader_read_vocabulary", "Read up to 50 words by exact IDs, including learning content and versions. Inaccessible IDs return null.", readWordsSchema.shape,
    input => call(() => readVocabulary(userId, input)));
  server.tool("reader_add_vocabulary", "Save 1–50 generic words or phrases. No page or source context. Duplicate saves preserve explanations and progress.", addWordsSchema.shape,
    input => call(async () => (await addVocabulary(userId, input)).map(({ word, created }) => ({ id: word.id, term: word.term, version: word.version, created }))));
  server.tool("reader_write_vocabulary_explanations", "Save Markdown learning explanations for 1–50 words, at most 500 KB total. Generate general meanings, natural examples, common phrases, confusing words and practice suggestions. Supply each exact ID and its current expectedVersion. Independent results: saved, conflict, not_found or failed. Reread unsuccessful words before retrying. This never changes labels, practice or learning status.", explanationBatchObject.shape,
    input => call(async () => (await writeExplanations(userId, input)).map(row => row.status === "saved" ? { id: row.id, status: row.status, version: row.word.version } : row)));
  server.tool("reader_update_vocabulary", "Update labels, practice or learning status only when requested. Supply current expectedVersion. Set reviewed=true to record a review.", {
    id: z.string().uuid(), ...wordUpdateObject.shape,
  }, ({ id, ...input }) => call(() => updateVocabulary(userId, id, input)));
  server.tool("reader_delete_vocabulary", "Delete a specific personal learning word and its explanation. Requires its current version.", {
    id: z.string().uuid(), expectedVersion: z.number().int().positive(),
  }, ({ id, expectedVersion }) => call(async () => { await deleteVocabulary(userId, id, expectedVersion); return { deletedId: id }; }));
}
