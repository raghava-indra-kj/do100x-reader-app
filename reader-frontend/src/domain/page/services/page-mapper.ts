import { AppError } from '@core/errors/app-error';
import { ok, type Result } from '@raghava.indra/result-ts';
import { safeParseMarkdown } from '../../../lib/md-parser/parse-markdown';
import type { MdSection } from '../../../lib/md-parser/types';
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
        category: db.category,
        sortOrder: db.sortOrder,
        createdAt: db.createdAt,
        updatedAt: db.updatedAt
    });
}

export function toPage(dbPage: DbPage): Result<Page, AppError> {
    const parseResult = safeParseMarkdown(dbPage.content ?? '');
    const sections: Section[] = parseResult.ok
        ? parseResult.data.sections.map((s) => toSection({ mdSection: s, pageId: dbPage.id }))
        : [
            new Section({
                id: 'root-section',
                pageId: dbPage.id,
                title: dbPage.title,
                rawTitle: dbPage.title,
                level: 1,
                content: dbPage.content ?? '',
                children: [],
            }),
        ];

    const page = new Page({
        id: dbPage.id,
        readerSpaceId: dbPage.readerSpaceId,
        userId: dbPage.userId,
        parentPageId: dbPage.parentPageId,
        title: dbPage.title,
        content: dbPage.content,
        category: dbPage.category,
        createdAt: dbPage.createdAt,
        updatedAt: dbPage.updatedAt,
        sections,
        childrenCount: dbPage.childrenCount,
        isOwner: dbPage.isOwner,
        revisionNumber: dbPage.revisionNumber,
        meaningSystemPrompt: dbPage.meaningSystemPrompt,
        explanationSystemPrompt: dbPage.explanationSystemPrompt,
        doubtSystemPrompt: dbPage.doubtSystemPrompt,
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
