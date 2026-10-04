import type { AsyncResult } from '@raghava.indra/result-ts';
import { ok } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import { CurrentUser } from '../models/current-user';
import type { IAuthRepo } from '../repos/auth-repo';
import { container, TYPES } from '@di/container';

export async function restoreSession(): AsyncResult<CurrentUser | null, AppError> {
    const result = await container.get<IAuthRepo>(TYPES.IAuthRepo).session();
    return result.ok ? ok(result.data ? new CurrentUser(result.data) : null) : result;
}

export async function signInWithGoogle(credential: string, nonce: string): AsyncResult<CurrentUser, AppError> {
    const result = await container.get<IAuthRepo>(TYPES.IAuthRepo).signIn(credential, nonce);
    return result.ok ? ok(new CurrentUser(result.data)) : result;
}

export function signOut(): AsyncResult<void, AppError> {
    return container.get<IAuthRepo>(TYPES.IAuthRepo).logout();
}
