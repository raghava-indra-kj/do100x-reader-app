import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { apiClient, getApiErrorMessage } from '@core/api/api-client';
import { AppError } from '@core/errors/app-error';
import { z } from 'zod';

const ShareLinkSchema = z.object({
    id: z.string(),
    createdById: z.string(),
    createdAt: z.coerce.date(),
    expiresAt: z.coerce.date().nullable(),
    revokedAt: z.coerce.date().nullable(),
});

const CreatedShareLinkSchema = ShareLinkSchema.extend({ token: z.string().min(1) });
const DocumentGrantSchema = z.object({
    userId: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    role: z.enum(['viewer', 'editor']),
    createdAt: z.coerce.date().optional(),
});

export type ShareLink = z.infer<typeof ShareLinkSchema>;
export type CreatedShareLink = z.infer<typeof CreatedShareLinkSchema>;
export type DocumentGrant = z.infer<typeof DocumentGrantSchema>;

export async function listDocumentGrants(documentId: string): AsyncResult<DocumentGrant[], AppError> {
    try {
        const { data } = await apiClient.get(`/reader/documents/${documentId}/grants`);
        return ok(z.array(DocumentGrantSchema).parse(data));
    } catch (error) {
        return err(new AppError({ message: getApiErrorMessage(error, 'Failed to load people with access'), cause: error }));
    }
}

export async function upsertDocumentGrant(params: {
    documentId: string;
    email: string;
    role: 'viewer' | 'editor';
}): AsyncResult<DocumentGrant, AppError> {
    try {
        const { data } = await apiClient.put(`/reader/documents/${params.documentId}/grants`, {
            email: params.email,
            role: params.role,
        });
        return ok(DocumentGrantSchema.parse(data));
    } catch (error) {
        return err(new AppError({ message: getApiErrorMessage(error, 'Failed to share with that person'), cause: error }));
    }
}

export async function revokeDocumentGrant(params: { documentId: string; userId: string }): AsyncResult<void, AppError> {
    try {
        await apiClient.delete(`/reader/documents/${params.documentId}/grants/${params.userId}`);
        return ok(undefined);
    } catch (error) {
        return err(new AppError({ message: getApiErrorMessage(error, 'Failed to remove access'), cause: error }));
    }
}

export async function listDocumentShareLinks(documentId: string): AsyncResult<ShareLink[], AppError> {
    try {
        const { data } = await apiClient.get(`/reader/documents/${documentId}/share-links`);
        return ok(z.array(ShareLinkSchema).parse(data));
    } catch (error) {
        return err(new AppError({ message: getApiErrorMessage(error, 'Failed to load share links'), cause: error }));
    }
}

export async function createDocumentShareLink(params: {
    documentId: string;
    expiresAt?: Date | null;
}): AsyncResult<CreatedShareLink, AppError> {
    try {
        const { data } = await apiClient.post(`/reader/documents/${params.documentId}/share-links`, {
            expiresAt: params.expiresAt?.toISOString() ?? null,
        });
        return ok(CreatedShareLinkSchema.parse(data));
    } catch (error) {
        return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create a share link'), cause: error }));
    }
}

export async function revokeDocumentShareLink(params: {
    documentId: string;
    shareLinkId: string;
}): AsyncResult<void, AppError> {
    try {
        await apiClient.delete(`/reader/documents/${params.documentId}/share-links/${params.shareLinkId}`);
        return ok(undefined);
    } catch (error) {
        return err(new AppError({ message: getApiErrorMessage(error, 'Failed to revoke the share link'), cause: error }));
    }
}
