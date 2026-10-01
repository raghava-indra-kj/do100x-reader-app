import { AUTH_PASSWORD_REQUIRED, AUTH_PASSWORD_TOO_LONG, AUTH_USERNAME_REQUIRED, AUTH_USERNAME_TOO_LONG } from '../const/error-codes';

export const USERNAME_MAX_LENGTH = 255;
export const PASSWORD_MAX_LENGTH = 255;

export function validateCredentials({ username, password }: { username: string; password: string }): { message: string; errorCode: string } | null {
    if (!username.trim()) return { message: 'Username is required', errorCode: AUTH_USERNAME_REQUIRED };
    if (username.length > USERNAME_MAX_LENGTH) return { message: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer`, errorCode: AUTH_USERNAME_TOO_LONG };
    if (!password.trim()) return { message: 'Password is required', errorCode: AUTH_PASSWORD_REQUIRED };
    if (password.length > PASSWORD_MAX_LENGTH) return { message: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`, errorCode: AUTH_PASSWORD_TOO_LONG };
    return null;
}
