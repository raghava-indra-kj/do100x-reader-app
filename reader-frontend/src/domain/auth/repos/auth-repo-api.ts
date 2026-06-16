import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { CurrentUserSchema, type CurrentUserData } from '../models/current-user';
import type { IAuthRepo } from './auth-repo';

export class AuthRepoApi implements IAuthRepo {
    async me({ username, password }: { username: string; password: string }): AsyncResult<CurrentUserData, AppError> {
        try {
            const { data } = await apiClient.post('/me', { username, password });
            return ok(CurrentUserSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Authentication failed'), cause: error }));
        }
    }

    async signup({ username, password }: { username: string; password: string }): AsyncResult<CurrentUserData, AppError> {
        try {
            const { data } = await apiClient.post('/signup', { username, password });
            return ok(CurrentUserSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Sign up failed'), cause: error }));
        }
    }
}
