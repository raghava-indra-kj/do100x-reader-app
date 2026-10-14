import { z } from 'zod';
import { apiClient } from '@core/api/api-client';

export const capturePayloadSchema = z.object({
    captureKey: z.string().uuid(), title: z.string().trim().min(1).max(1000),
    content: z.string().min(1).refine(value => new TextEncoder().encode(value).length <= 512 * 1024, 'Select a smaller section (maximum 512 KB).'),
    sourceUrl: z.string().url().max(2048).refine(value => /^https?:\/\//i.test(value)).nullable(),
}).strict();
export const captureItemSchema = z.object({
    id: z.string().uuid(), title: z.string(), captureExpiresAt: z.coerce.date(),
    captureSourceUrl: z.string().nullable(), createdAt: z.coerce.date(),
});
export type CaptureItem = z.infer<typeof captureItemSchema>;
export async function loadCaptures() {
    const response = await apiClient.get('/reader/captures');
    return z.object({ items: z.array(captureItemSchema), lifetimeDays: z.number(), limit: z.number() }).parse(response.data);
}
export async function saveCapture(payload: unknown) {
    const response = await apiClient.post('/reader/captures', capturePayloadSchema.parse(payload));
    return z.object({ id: z.string().uuid(), expiresAt: z.coerce.date().nullable() }).parse(response.data);
}
export async function keepCapture(id: string, destinationId: string | null) {
    let parentPageId = destinationId;
    if (!parentPageId) {
        const response = await apiClient.post('/reader/home');
        parentPageId = z.object({ homePageId: z.string().uuid() }).parse(response.data).homePageId;
    }
    const response = await apiClient.post(`/reader/captures/${encodeURIComponent(id)}/keep`, { parentPageId });
    return z.object({ id: z.string().uuid() }).parse(response.data);
}
export async function discardCapture(id: string) {
    await apiClient.delete(`/reader/captures/${encodeURIComponent(id)}`);
}
