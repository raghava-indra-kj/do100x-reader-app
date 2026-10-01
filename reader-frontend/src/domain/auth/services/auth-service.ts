import type { AsyncResult } from '@raghava.indra/result-ts';
import { err, ok } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { validateCredentials } from './credential-validation';
import type { CurrentUser } from '../models/current-user';
import type { IAuthRepo } from '../repos/auth-repo';
import { container, TYPES } from '@di/container';
import { toCurrentUser } from './auth-mapper';

export async function me(
    { username, password }: { username: string; password: string }
): AsyncResult<CurrentUser, AppError> {
    const validation = validateCredentials({ username, password });
    if (validation) return err(new AppError(validation));
    const repo = container.get<IAuthRepo>(TYPES.IAuthRepo);
    const result = await repo.me({ username, password });
    if (!result.ok) return result;
    return ok(toCurrentUser(result.data));
}

export async function signup(
    { username, password }: { username: string; password: string }
): AsyncResult<CurrentUser, AppError> {
    const validation = validateCredentials({ username, password });
    if (validation) return err(new AppError(validation));
    const repo = container.get<IAuthRepo>(TYPES.IAuthRepo);
    const result = await repo.signup({ username, password });
    if (!result.ok) return result;
    return ok(toCurrentUser(result.data));
}
