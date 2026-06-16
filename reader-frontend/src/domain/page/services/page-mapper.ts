import { AppError } from '@core/errors/app-error';
import { err, ok, type Result } from '@raghava.indra/result-ts';
import { safeParseMarkdown } from '../../../lib/md-parser/parse-markdown';
import type { MdSection } from '../../../lib/md-parser/types';
import { PAGE_PARSE_FAILED } from '../const/error-codes';
import type { DbPage } from '../models/db-page';
import type { DbPageListItem } from '../models/db-page-list-item';
import { Page } from '../models/page';
import { PageListItem } from '../models/page-list-item';
import { Section } from '../models/section';

export function toPageListItem(db: DbPageListItem): PageListItem {
    return new PageListItem({
        id: db.id,
        parentPageId: db.parentPageId,
        title: db.title,
        sortOrder: db.sortOrder,
        createdAt: db.createdAt,
        updatedAt: db.updatedAt
    });
}

export function toPage(dbPage: DbPage): Result<Page, AppError> {
    const parseResult = safeParseMarkdown(dbPage.content);
    if (!parseResult.ok) {
        const parseErr = new AppError({
            errorCode: PAGE_PARSE_FAILED,
            message: `Failed to parse markdown`,
            cause: parseResult.error,
        });
        return err(parseErr);
    }
    const doc = parseResult.data;
    const page = new Page({
        id: dbPage.id,
        parentPageId: dbPage.parentPageId,
        title: dbPage.title,
        content: dbPage.content,
        createdAt: dbPage.createdAt,
        updatedAt: dbPage.updatedAt,
        sections: doc.sections.map((s) => toSection({ mdSection: s, pageId: dbPage.id })),
    });
    return ok(page);
}

function toSection({ mdSection, pageId }: { mdSection: MdSection, pageId: string }): Section {
    return new Section({
        id: mdSection.id,
        pageId: pageId,
        title: mdSection.title,
        rawTitle: mdSection.rawTitle,
        level: mdSection.level,
        content: mdSection.content,
        children: mdSection.children.map((s) => toSection({ mdSection: s, pageId })),
    });
}