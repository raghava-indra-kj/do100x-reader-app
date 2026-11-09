import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { PageAnnotationSchema, type NewPageAnnotation, type PageAnnotation, type PageAnnotationAnchorInput, type PageAnnotationPatch } from '../models/page-annotation';
import type { IPageAnnotationRepo } from './page-annotation-repo';

export class PageAnnotationRepoApi implements IPageAnnotationRepo {
    async list({ pageId }: { pageId: string }): AsyncResult<PageAnnotation[], AppError> {
        try {
            const { data } = await apiClient.get('/page-annotations', { params: { pageId } });
            return ok((data as unknown[]).map((item) => PageAnnotationSchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load key takeaways. Try again.'), cause: error }));
        }
    }

    async create(params: { pageId: string; anchor: PageAnnotationAnchorInput; items: NewPageAnnotation[]; replace?: boolean }): AsyncResult<PageAnnotation[], AppError> {
        try {
            const { data } = await apiClient.post('/page-annotations', params);
            return ok((data as unknown[]).map((item) => PageAnnotationSchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save the key takeaways. Try again.'), cause: error }));
        }
    }

    async update({ id, ...patch }: { id: string } & PageAnnotationPatch): AsyncResult<void, AppError> {
        try {
            await apiClient.patch(`/page-annotations/${id}`, patch);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save the takeaway. Try again.'), cause: error }));
        }
    }

    async reorder(params: { pageId: string; ids: string[] }): AsyncResult<void, AppError> {
        try {
            await apiClient.post('/page-annotations/reorder', params);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t reorder the takeaways. Try again.'), cause: error }));
        }
    }

    async remove({ id }: { id: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/page-annotations/${id}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t delete the takeaway. Try again.'), cause: error }));
        }
    }
}
