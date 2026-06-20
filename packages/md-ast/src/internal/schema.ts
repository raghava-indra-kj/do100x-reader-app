import { z } from "zod";

/** Fields every block must have. */
const blockBase = { id: z.string().min(1), markdown: z.string() };

/** Valid heading level values (1–6). */
const headingLevel = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);

/** Validates any single block object by its type discriminant. */
const blockSchema = z.discriminatedUnion("type", [
    z.object({ ...blockBase, type: z.literal("heading"), level: headingLevel }),
    z.object({ ...blockBase, type: z.literal("unknown"), nodeType: z.string() }),
]);

/** Validates a full MdAstDocument from untrusted input (e.g. a database row). */
export const documentSchema = z.object({
    frontmatter: z.record(z.string(), z.unknown()).nullable(),
    blocks: z.array(blockSchema),
});
