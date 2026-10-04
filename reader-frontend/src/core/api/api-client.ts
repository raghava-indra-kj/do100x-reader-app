import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/backend-api',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
});

// Notify the session store without importing UI/authentication modules here.
apiClient.interceptors.response.use(response => response, error => {
    // Authentication endpoints handle their own outcome. In particular, a stale
    // session-restore response must not clear a newer successful sign-in.
    if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.startsWith('/auth/') && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('reader:session-expired'));
    }
    return Promise.reject(error);
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) return error.response?.data?.message ?? fallback;
    return fallback;
}
