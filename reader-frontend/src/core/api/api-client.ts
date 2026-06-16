import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/backend-api',
    headers: { 'Content-Type': 'application/json' },
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
}
