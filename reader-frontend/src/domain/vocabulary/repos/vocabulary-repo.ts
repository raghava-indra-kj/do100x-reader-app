import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { DbVocabulary } from '../models/db-vocabulary';

export interface IVocabularyRepo {

    getVocabulary(params: { pageId?: string; date?: string }): AsyncResult<DbVocabulary[], AppError>;

    createVocabulary(params: { pageId: string; term: string }): AsyncResult<string, AppError>;

    deleteVocabulary(params: { vocabId: string }): AsyncResult<void, AppError>;
}