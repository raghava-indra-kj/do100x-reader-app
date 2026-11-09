import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { NewPageAnnotation, PageAnnotation, PageAnnotationAnchorInput, PageAnnotationPatch } from '../models/page-annotation';
import type { IPageAnnotationRepo } from '../repos/page-annotation-repo';
import { container, TYPES } from '@di/container';

const repo = () => container.get<IPageAnnotationRepo>(TYPES.IPageAnnotationRepo);

export async function getPageAnnotations(params: { pageId: string }): AsyncResult<PageAnnotation[], AppError> {
    return repo().list(params);
}

export async function createPageAnnotations(params: { pageId: string; anchor: PageAnnotationAnchorInput; items: NewPageAnnotation[]; replace?: boolean }): AsyncResult<PageAnnotation[], AppError> {
    return repo().create(params);
}

export async function updatePageAnnotation(params: { id: string } & PageAnnotationPatch): AsyncResult<void, AppError> {
    return repo().update(params);
}

export async function reorderPageAnnotations(params: { pageId: string; ids: string[] }): AsyncResult<void, AppError> {
    return repo().reorder(params);
}

export async function deletePageAnnotation(params: { id: string }): AsyncResult<void, AppError> {
    return repo().remove(params);
}
