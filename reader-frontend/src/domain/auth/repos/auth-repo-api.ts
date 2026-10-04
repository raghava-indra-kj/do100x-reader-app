import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import axios from 'axios';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { CurrentUserSchema, type CurrentUserData } from '../models/current-user';
import type { IAuthRepo } from './auth-repo';

export class AuthRepoApi implements IAuthRepo {
    async session(): AsyncResult<CurrentUserData | null, AppError> {
        try {
            const { data } = await apiClient.get('/auth/session');
            return ok(CurrentUserSchema.parse(data));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) return ok(null);
            return err(new AppError({ message: getApiErrorMessage(error, 'Could not restore your session'), cause: error }));
        }
    }

    async signIn(credential: string, nonce: string): AsyncResult<CurrentUserData, AppError> {
        try {
            const { data } = await apiClient.post('/auth/google', { credential }, { headers: { 'x-login-csrf': nonce } });
            return ok(CurrentUserSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Google sign-in failed'), cause: error }));
        }
    }

    async logout(): AsyncResult<void, AppError> {
        try {
            await apiClient.post('/auth/logout');
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Sign-out failed. Please retry.'), cause: error }));
        }
    }
}
