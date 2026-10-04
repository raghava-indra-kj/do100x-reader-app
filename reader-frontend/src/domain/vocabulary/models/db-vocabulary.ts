import { z } from 'zod';

export const DbVocabularySchema = z.object({
    id: z.string(),
    term: z.string(),
    explanationMarkdown: z.string().nullable(),
    difficulty: z.enum(['unrated', 'easy', 'medium', 'difficult']),
    usageFrequency: z.enum(['unrated', 'frequent', 'occasional', 'rare']),
    learningStatus: z.enum(['learning', 'learned']),
    practiceText: z.string(),
    lastReviewedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    version: z.number().int().positive(),
});

export type DbVocabulary = z.infer<typeof DbVocabularySchema>;

export const VocabularySummarySchema = DbVocabularySchema.omit({ explanationMarkdown: true, practiceText: true }).extend({ hasExplanation: z.boolean() });
export type VocabularySummary = z.infer<typeof VocabularySummarySchema>;
export const VocabularyListSchema = z.object({
    items: z.array(VocabularySummarySchema), total: z.number(), nextOffset: z.number().nullable(),
});
export type VocabularyList = z.infer<typeof VocabularyListSchema>;
export type VocabularyQuery = {
    search?: string; savedFrom?: string; savedBefore?: string;
    difficulty?: DbVocabulary['difficulty']; usageFrequency?: DbVocabulary['usageFrequency'];
    learningStatus?: DbVocabulary['learningStatus']; missingExplanation?: boolean;
    sort?: 'priority' | 'newest'; offset?: number; limit?: number;
};
export type VocabularyUpdate = {
    expectedVersion: number; difficulty?: DbVocabulary['difficulty'];
    usageFrequency?: DbVocabulary['usageFrequency']; learningStatus?: DbVocabulary['learningStatus'];
    practiceText?: string; reviewed?: true;
};
