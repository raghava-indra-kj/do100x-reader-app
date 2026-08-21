import type { AsyncResult } from '@raghava.indra/result-ts';
import { err, ok } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import type { CurrentUser } from '../models/current-user';
import type { IAuthRepo } from '../repos/auth-repo';
import { container, TYPES } from '@di/container';
import { toCurrentUser } from './auth-mapper';

export async function signInWithGoogle({ idToken }: { idToken: string }): AsyncResult<CurrentUser, AppError> {
    if (!idToken.trim()) {
        return err(new AppError({ message: 'Google did not return a sign-in credential.' }));
    }
    const repo = container.get<IAuthRepo>(TYPES.IAuthRepo);
    const result = await repo.signInWithGoogle({ idToken });
    if (!result.ok) return result;
    return ok(toCurrentUser(result.data));
}

export async function getCurrentUser(): AsyncResult<CurrentUser, AppError> {
    const repo = container.get<IAuthRepo>(TYPES.IAuthRepo);
    const result = await repo.getCurrentUser();
    if (!result.ok) return result;
    return ok(toCurrentUser(result.data));
}

export async function logout(): AsyncResult<void, AppError> {
    const repo = container.get<IAuthRepo>(TYPES.IAuthRepo);
    return repo.logout();
}

export async function createMcpAccessToken(): AsyncResult<string, AppError> {
    const repo = container.get<IAuthRepo>(TYPES.IAuthRepo);
    return repo.createMcpAccessToken();
}
