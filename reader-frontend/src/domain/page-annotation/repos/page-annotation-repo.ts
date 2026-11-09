import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { NewPageAnnotation, PageAnnotation, PageAnnotationAnchorInput, PageAnnotationPatch } from '../models/page-annotation';

export interface IPageAnnotationRepo {
    list(params: { pageId: string }): AsyncResult<PageAnnotation[], AppError>;
    create(params: { pageId: string; anchor: PageAnnotationAnchorInput; items: NewPageAnnotation[]; replace?: boolean }): AsyncResult<PageAnnotation[], AppError>;
    update(params: { id: string } & PageAnnotationPatch): AsyncResult<void, AppError>;
    reorder(params: { pageId: string; ids: string[] }): AsyncResult<void, AppError>;
    remove(params: { id: string }): AsyncResult<void, AppError>;
}
