import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { z } from 'zod';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbVocabularySchema, VocabularyListSchema, type DbVocabulary, type VocabularyList, type VocabularyQuery, type VocabularyUpdate } from '../models/db-vocabulary';
import type { IVocabularyRepo } from './vocabulary-repo';

async function request<T>(fn: () => Promise<T>): AsyncResult<T, AppError> {
    try { return ok(await fn()); }
    catch (cause) { return err(cause instanceof AppError ? cause : new AppError({ message: getApiErrorMessage(cause, 'Couldn’t update vocabulary. Try again.'), cause })); }
}
export class VocabularyRepoApi implements IVocabularyRepo {
    getVocabulary(params: VocabularyQuery): AsyncResult<VocabularyList, AppError> {
        return request(async () => VocabularyListSchema.parse((await apiClient.get('/vocabulary', { params })).data));
    }
    readVocabulary(id: string): AsyncResult<DbVocabulary, AppError> {
        return request(async () => {
            const rows = z.array(z.object({ id: z.string(), word: DbVocabularySchema.nullable() })).parse((await apiClient.post('/vocabulary/read', { ids: [id] })).data);
            if (!rows[0]?.word) throw new AppError({ message: 'Word not found.' });
            return rows[0].word;
        });
    }
    createVocabulary({ term }: { term: string }) {
        return request(async () => z.array(z.object({ word: DbVocabularySchema, created: z.boolean() })).parse((await apiClient.post('/vocabulary', { words: [term] })).data)[0]);
    }
    updateVocabulary(id: string, params: VocabularyUpdate) {
        return request(async () => DbVocabularySchema.parse((await apiClient.patch(`/vocabulary/${id}`, params)).data));
    }
    saveExplanation(id: string, expectedVersion: number, explanationMarkdown: string) {
        return request(async () => {
            const rows = z.array(z.object({ id: z.string(), status: z.enum(['saved', 'conflict', 'not_found', 'failed']), word: DbVocabularySchema.optional(), message: z.string().optional() })).parse(
                (await apiClient.put('/vocabulary/explanations', { words: [{ id, expectedVersion, explanationMarkdown }] })).data);
            if (rows[0]?.status !== 'saved' || !rows[0].word) throw new AppError({ message: rows[0]?.message ?? 'Couldn’t save the explanation.' });
            return rows[0].word;
        });
    }
    deleteVocabulary({ vocabId, expectedVersion }: { vocabId: string; expectedVersion: number }) {
        return request(async () => { await apiClient.delete(`/vocabulary/${vocabId}`, { data: { expectedVersion } }); });
    }
}
