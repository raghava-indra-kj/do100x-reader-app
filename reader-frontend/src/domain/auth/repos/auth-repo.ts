import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { CurrentUserData } from '../models/current-user';

export interface IAuthRepo {
    signInWithGoogle(params: { idToken: string }): AsyncResult<CurrentUserData, AppError>;
    getCurrentUser(): AsyncResult<CurrentUserData, AppError>;
    logout(): AsyncResult<void, AppError>;
    createMcpAccessToken(): AsyncResult<string, AppError>;
}
