import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { DbPage } from '../models/db-page';
import type { DbPageListItem } from '../models/db-page-list-item';
import type { SectionEditSnapshot, SectionEditParams } from '../models/section-edit';
import type { PageSearchResponse } from '../models/page-search';

export interface IPagesRepo {
    searchPages(params: { q: string; limit?: number; signal?: AbortSignal }): AsyncResult<PageSearchResponse, AppError>;
    getSectionEditSnapshot(pageId: string): AsyncResult<SectionEditSnapshot, AppError>;
    editSectionBody(params: SectionEditParams): AsyncResult<{ content: string; contentVersion: number }, AppError>;

    getPage(params: { pageId: string }): AsyncResult<DbPage, AppError>;

    createPage(params: {
        parentPageId: string | null;
        title: string;
        content: string;
        category: string | null;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<string, AppError>;

    editPage(params: {
        pageId: string;
        contentVersion: number;
        title: string;
        content: string;
        category: string | null;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<void, AppError>;

    updateShareStatus(params: {
        pageId: string;
        isPublic: boolean;
    }): AsyncResult<{ isPublic: boolean; isPubliclyAccessible: boolean }, AppError>;

    deletePage(params: { pageId: string }): AsyncResult<void, AppError>;

    queryPages(params: {
        parentPageId?: string | null;
        searchQuery?: string | null;
    }): AsyncResult<DbPageListItem[], AppError>;

    swapSortOrder(params: {
        pageId1: string;
        pageId2: string;
    }): AsyncResult<void, AppError>;
}
