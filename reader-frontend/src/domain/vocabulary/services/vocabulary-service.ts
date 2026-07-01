import type { AsyncResult } from '@raghava.indra/result-ts';
import { ok } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { Vocabulary } from '../models/vocabulary';
import type { IVocabularyRepo } from '../repos/vocabulary-repo';
import { container, TYPES } from '@di/container';
import { Vocabulary as VocabularyModel } from '../models/vocabulary';

function toVocabulary(db: import('../models/db-vocabulary').DbVocabulary): Vocabulary {
    return new VocabularyModel({
        id: db.id,
        pageId: db.pageId,
        term: db.term,
        createdAt: db.createdAt,
    });
}

export async function getVocabulary(
    params: { pageId?: string; date?: string }
): AsyncResult<Vocabulary[], AppError> {
    const repo = container.get<IVocabularyRepo>(TYPES.IVocabularyRepo);
    const result = await repo.getVocabulary(params);
    if (!result.ok) return result;
    return ok(result.data.map(toVocabulary));
}

export async function createVocabulary(
    params: { pageId: string; term: string }
): AsyncResult<string, AppError> {
    const repo = container.get<IVocabularyRepo>(TYPES.IVocabularyRepo);
    const result = await repo.createVocabulary(params);
    if (!result.ok) return result;
    return ok(result.data);
}

export async function deleteVocabulary(
    params: { vocabId: string }
): AsyncResult<void, AppError> {
    const repo = container.get<IVocabularyRepo>(TYPES.IVocabularyRepo);
    return repo.deleteVocabulary(params);
}