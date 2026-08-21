import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { CurrentUserSchema, type CurrentUserData } from '../models/current-user';
import type { IAuthRepo } from './auth-repo';

export class AuthRepoApi implements IAuthRepo {
    async signInWithGoogle({ idToken }: { idToken: string }): AsyncResult<CurrentUserData, AppError> {
        try {
            const { data } = await apiClient.post('/auth/google', { idToken });
            return ok(CurrentUserSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Google sign-in failed'), cause: error }));
        }
    }

    async getCurrentUser(): AsyncResult<CurrentUserData, AppError> {
        try {
            const { data } = await apiClient.get('/auth/me');
            return ok(CurrentUserSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Session could not be restored'), cause: error }));
        }
    }

    async logout(): AsyncResult<void, AppError> {
        try {
            await apiClient.post('/auth/logout');
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Sign out failed'), cause: error }));
        }
    }

    async createMcpAccessToken(): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/auth/mcp-access-token');
            if (typeof data?.token !== 'string') {
                return err(new AppError({ message: 'The server returned an invalid MCP token' }));
            }
            return ok(data.token);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Could not generate an MCP access token'), cause: error }));
        }
    }
}
