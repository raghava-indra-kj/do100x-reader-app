import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { DbVocabulary, VocabularyList, VocabularyQuery, VocabularyUpdate } from '../models/db-vocabulary';

export interface IVocabularyRepo {
    getVocabulary(params: VocabularyQuery): AsyncResult<VocabularyList, AppError>;
    readVocabulary(id: string): AsyncResult<DbVocabulary, AppError>;
    createVocabulary(params: { term: string }): AsyncResult<{ word: DbVocabulary; created: boolean }, AppError>;
    updateVocabulary(id: string, params: VocabularyUpdate): AsyncResult<DbVocabulary, AppError>;
    saveExplanation(id: string, expectedVersion: number, explanationMarkdown: string): AsyncResult<DbVocabulary, AppError>;
    deleteVocabulary(params: { vocabId: string; expectedVersion: number }): AsyncResult<void, AppError>;
}
