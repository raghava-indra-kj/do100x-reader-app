import { Container } from 'inversify';
import { AuthRepoApi } from '@domain/auth/repos/auth-repo-api';
import { PageRepoApi } from '@domain/page/repos/page-repo-api';
import { CommentsRepoApi } from '@domain/comment/repos/comments-repo-api';
import { TYPES } from './types';

const container = new Container();

container.bind(TYPES.IAuthRepo).to(AuthRepoApi);
container.bind(TYPES.IPagesRepo).to(PageRepoApi);
container.bind(TYPES.ICommentsRepo).to(CommentsRepoApi);

export { container, TYPES };
