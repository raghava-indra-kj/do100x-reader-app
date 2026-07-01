import { z } from 'zod';

export const DbVocabularySchema = z.object({
    id: z.string(),
    pageId: z.string(),
    term: z.string(),
    createdAt: z.coerce.date(),
});

export type DbVocabulary = z.infer<typeof DbVocabularySchema>;