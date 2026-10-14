import axios from 'axios';
import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import { extractFrontmatterTitle } from '@lib/md-parser/extract';

// Matches express.json({ limit: '10mb' }) in the backend. This is a request limit,
// not a file limit: JSON escaping and UTF-8 encoding also count towards it.
export const MARKDOWN_IMPORT_REQUEST_LIMIT = 10 * 1024 * 1024;
export const MARKDOWN_IMPORT_TITLE_LIMIT = 1000;

export interface MarkdownImportPayload {
    parentPageId: string;
    title: string;
    content: string;
    category: null;
}

export interface PreparedMarkdownFile {
    name: string;
    size: number;
    title: string;
    content: string;
}

export interface MarkdownImportItem extends Omit<PreparedMarkdownFile, 'content'> {
    id: string;
    content: string | null;
    status: 'reading' | 'ready' | 'importing' | 'imported' | 'failed';
    error: string | null;
    needsReview: boolean;
    pageId: string | null;
}

export function markdownFilenameTitle(name: string): string {
    return name.replace(/\.(?:md|markdown)$/i, '').trim() || 'Untitled';
}

export async function readMarkdownFile(file: Pick<File, 'name' | 'size' | 'arrayBuffer'>): AsyncResult<PreparedMarkdownFile, AppError> {
    if (!/\.(?:md|markdown)$/i.test(file.name)) {
        return err(new AppError({ message: 'Choose a .md or .markdown file.' }));
    }
    if (file.size >= MARKDOWN_IMPORT_REQUEST_LIMIT) {
        return err(new AppError({ message: 'This file exceeds the 10 MiB save limit. Split it into smaller files.' }));
    }

    let bytes: ArrayBuffer;
    try {
        bytes = await file.arrayBuffer();
    } catch {
        return err(new AppError({ message: 'Couldn’t read this file. Select it again.' }));
    }

    let content: string;
    try {
        // Keep a UTF-8 BOM and original line endings; never silently replace
        // undecodable bytes or strip frontmatter from the stored source.
        content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
        return err(new AppError({ message: 'This file isn’t UTF-8 text. Save it as UTF-8 and select it again.' }));
    }
    if (!content.trim()) {
        return err(new AppError({ message: 'This file is empty.' }));
    }

    // Parse only the leading metadata block, not the entire document, to keep
    // title extraction inexpensive for large files. The original source is kept.
    const frontmatter = /^---[\t ]*\r?\n[\s\S]*?\r?\n---[\t ]*(?=\r?\n|$)/.exec(content.replace(/^\uFEFF/, ''))?.[0];
    const title = (frontmatter ? extractFrontmatterTitle(frontmatter).title : null) ?? markdownFilenameTitle(file.name);
    return ok({ name: file.name, size: file.size, title, content });
}

export function markdownImportRequestBytes(payload: MarkdownImportPayload): number {
    return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

export function markdownImportTitleError(title: string): string | null {
    if (!title.trim()) return 'Enter a page title.';
    if (title.trim().length > MARKDOWN_IMPORT_TITLE_LIMIT) return 'Keep the page title to 1,000 characters or fewer.';
    return null;
}

export function canImportMarkdownItem(item: MarkdownImportItem): boolean {
    return item.content !== null && !item.needsReview && (item.status === 'ready' || item.status === 'failed');
}

export function markdownImportFailure(error: AppError): { message: string; needsReview: boolean } {
    if (error.errorCode === 'PAGE_CREATE_UNEXPECTED_RESPONSE') {
        return { message: error.message, needsReview: true };
    }
    if (axios.isAxiosError(error.cause)) {
        const response = error.cause.response;
        if (!response) {
            return { message: 'The connection was interrupted. Check your subpages before retrying; this page may have been saved.', needsReview: true };
        }
        const status = response.status;
        if (status === 413) {
            return { message: 'The server rejected this file as too large (HTTP 413). Split it into smaller files.', needsReview: false };
        }
        const html = String(response.headers?.['content-type'] ?? '').includes('text/html')
            || (typeof response.data === 'string' && /^\s*</.test(response.data));
        const needsReview = status >= 500;
        if (html) {
            return {
                message: `The server returned an HTML error page (HTTP ${status}). The hosting server may have blocked this content.${needsReview ? ' Check your subpages before retrying.' : ''}`,
                needsReview,
            };
        }
        return { message: `${error.message} (HTTP ${status})${needsReview ? ' Check your subpages before retrying.' : ''}`, needsReview };
    }
    return { message: error.message, needsReview: false };
}

type CreateImportedPage = (payload: MarkdownImportPayload) => AsyncResult<string, AppError>;

export async function importMarkdownFiles({ items, parentPageId, createPage, onItemChange, isActive }: {
    items: MarkdownImportItem[];
    parentPageId: string;
    createPage: CreateImportedPage;
    onItemChange: (id: string, changes: Partial<MarkdownImportItem>) => void;
    isActive: () => boolean;
}): Promise<number> {
    let imported = 0;
    for (const item of items) {
        if (!isActive()) break;
        if (!canImportMarkdownItem(item)) continue;
        const payload: MarkdownImportPayload = { parentPageId, title: item.title.trim(), content: item.content!, category: null };
        const validation = markdownImportTitleError(payload.title)
            ?? (markdownImportRequestBytes(payload) > MARKDOWN_IMPORT_REQUEST_LIMIT
                ? 'This page exceeds the 10 MiB save limit once encoded. Split the file into smaller files.' : null);
        if (validation) {
            onItemChange(item.id, { status: 'failed', error: validation, needsReview: false });
            continue;
        }
        onItemChange(item.id, { status: 'importing', error: null });
        try {
            const result = await createPage(payload);
            if (result.ok) {
                imported++;
                if (isActive()) onItemChange(item.id, { status: 'imported', pageId: result.data, content: null, error: null, needsReview: false });
            } else if (isActive()) {
                const failure = markdownImportFailure(result.error);
                onItemChange(item.id, { status: 'failed', error: failure.message, needsReview: failure.needsReview });
            }
        } catch {
            if (isActive()) onItemChange(item.id, {
                status: 'failed',
                error: 'Couldn’t confirm the import. Check your subpages before retrying; this page may have been saved.',
                needsReview: true,
            });
        }
    }
    return imported;
}
