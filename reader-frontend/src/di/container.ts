import { Container } from 'inversify';
import { AuthRepoApi } from '@domain/auth/repos/auth-repo-api';
import { PageRepoApi } from '@domain/page/repos/page-repo-api';
import { TYPES } from './types';

const container = new Container();

container.bind(TYPES.IAuthRepo).to(AuthRepoApi);
container.bind(TYPES.IPagesRepo).to(PageRepoApi);

export { container, TYPES };
