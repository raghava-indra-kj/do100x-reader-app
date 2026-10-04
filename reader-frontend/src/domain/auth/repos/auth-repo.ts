import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { CurrentUserData } from '../models/current-user';

export interface IAuthRepo {
    session(): AsyncResult<CurrentUserData | null, AppError>;
    signIn(credential: string, nonce: string): AsyncResult<CurrentUserData, AppError>;
    logout(): AsyncResult<void, AppError>;
}
