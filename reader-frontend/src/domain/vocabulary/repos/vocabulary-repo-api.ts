import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbVocabularySchema, type DbVocabulary } from '../models/db-vocabulary';
import type { IVocabularyRepo } from './vocabulary-repo';

export class VocabularyRepoApi implements IVocabularyRepo {
    async getVocabulary(params: { pageId?: string; date?: string }): AsyncResult<DbVocabulary[], AppError> {
        try {
            const query: Record<string, string> = {};
            if (params.pageId) query.pageId = params.pageId;
            if (params.date) query.date = params.date;
            const { data } = await apiClient.get('/vocabulary', { params: query });
            return ok((data as unknown[]).map((item) => DbVocabularySchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load saved words. Try again.'), cause: error }));
        }
    }

    async createVocabulary(params: { pageId: string; term: string }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/vocabulary', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save the word. Try again.'), cause: error }));
        }
    }

    async deleteVocabulary({ vocabId }: { vocabId: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/vocabulary/${vocabId}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t remove the saved word. Try again.'), cause: error }));
        }
    }
}
