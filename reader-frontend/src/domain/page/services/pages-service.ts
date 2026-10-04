import type { AsyncResult } from '@raghava.indra/result-ts';
import { err, ok } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { PAGE_TITLE_REQUIRED } from '../const/error-codes';
import type { Page } from '../models/page';
import type { PageListItem } from '../models/page-list-item';
import type { IPagesRepo } from '../repos/pages-repo';
import { container, TYPES } from '@di/container';
import { toPage, toPageListItem } from './page-mapper';
import type { SectionEditParams, SectionEditSnapshot } from '../models/section-edit';

export async function getSectionEditSnapshot(pageId: string): AsyncResult<SectionEditSnapshot, AppError> {
    return container.get<IPagesRepo>(TYPES.IPagesRepo).getSectionEditSnapshot(pageId);
}

export async function saveSectionBody(params: SectionEditParams): AsyncResult<{ content: string; contentVersion: number }, AppError> {
    return container.get<IPagesRepo>(TYPES.IPagesRepo).editSectionBody(params);
}

export async function getPage(
    params: { pageId: string }
): AsyncResult<Page, AppError> {
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    const result = await repo.getPage(params);
    if (!result.ok) return result;
    const pageResult = toPage(result.data);
    if (!pageResult.ok) {
        return err(pageResult.error);
    }
    return ok(pageResult.data);
}

export async function createPage(
    params: {
        parentPageId: string | null;
        title: string;
        content: string;
        category: string | null;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }
): AsyncResult<string, AppError> {
    if (!params.title.trim()) {
        return err(new AppError({ message: 'Enter a title.', errorCode: PAGE_TITLE_REQUIRED }));
    }
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    const result = await repo.createPage(params);
    if (!result.ok) return result;
    return ok(result.data);
}

export async function editPage(
    params: {
        pageId: string;
        contentVersion: number;
        title: string;
        content: string;
        category: string | null;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }
): AsyncResult<void, AppError> {
    if (!params.title.trim()) {
        return err(new AppError({ message: 'Enter a title.', errorCode: PAGE_TITLE_REQUIRED }));
    }
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    const result = await repo.editPage(params);
    if (!result.ok) return result;
    return ok(undefined);
}

export async function updatePageShareStatus(
    params: { pageId: string; isPublic: boolean }
): AsyncResult<{ isPublic: boolean; isPubliclyAccessible: boolean }, AppError> {
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    return repo.updateShareStatus(params);
}

export async function deletePage(
    params: { pageId: string }
): AsyncResult<void, AppError> {
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    return repo.deletePage(params);
}

export async function queryPages(
    params: { parentPageId: string | null; searchQuery?: string | null }
): AsyncResult<PageListItem[], AppError> {
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    const result = await repo.queryPages(params);
    if (!result.ok) return result;
    return ok(result.data.map(toPageListItem));
}

export async function swapSortOrder(
    params: { pageId1: string; pageId2: string }
): AsyncResult<void, AppError> {
    const repo = container.get<IPagesRepo>(TYPES.IPagesRepo);
    return repo.swapSortOrder(params);
}
