import type { ServiceIdentifier } from 'inversify';
import type { IAuthRepo } from '@domain/auth/repos/auth-repo';
import type { IPagesRepo } from '@domain/page/repos/pages-repo';

export const TYPES = {
    IAuthRepo: Symbol.for('IAuthRepo') as ServiceIdentifier<IAuthRepo>,
    IPagesRepo: Symbol.for('IPagesRepo') as ServiceIdentifier<IPagesRepo>,
};
