import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/backend-api',
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    },
});

apiClient.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem('current_user');
        if (raw) {
            const user = JSON.parse(raw);
            if (user?.id) {
                config.headers['x-user-id'] = user.id;
            }
        }
    } catch {
        // ignore
    }
    return config;
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
}
