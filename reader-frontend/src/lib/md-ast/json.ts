import { MdAstError, type MdAstDocument, type ParseResult } from "./types";
import { documentSchema } from "./internal/schema";

/**
 * Returns a detached, JSON-safe clone of the document.
 * Use this before JSON.stringify or storing to the database — strips MobX proxies.
 */
export function toJson(doc: MdAstDocument): MdAstDocument {
    return structuredClone(doc);
}

/**
 * Validates and hydrates an untrusted value (e.g. a parsed DB row) into a typed MdAstDocument.
 * Throws MdAstError if the shape does not match the schema.
 */
export function fromJson(value: unknown): MdAstDocument {
    const result = documentSchema.safeParse(value);
    if (!result.success) {
        throw new MdAstError(`Invalid md-ast document: ${result.error.message}`, { cause: result.error });
    }
    return result.data as MdAstDocument;
}

/** Non-throwing variant of fromJson — returns { ok: true, data } on success or { ok: false, error } on failure. */
export function safeFromJson(value: unknown): ParseResult {
    try {
        return { ok: true, data: fromJson(value) };
    } catch (error) {
        return { ok: false, error: error as MdAstError };
    }
}
