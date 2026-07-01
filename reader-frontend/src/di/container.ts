import { Container } from 'inversify';
import { AuthRepoApi } from '@domain/auth/repos/auth-repo-api';
import { PageRepoApi } from '@domain/page/repos/page-repo-api';
import { CommentsRepoApi } from '@domain/comment/repos/comments-repo-api';
import { VocabularyRepoApi } from '@domain/vocabulary/repos/vocabulary-repo-api';
import { SettingsRepoApi } from '@domain/settings/repos/settings-repo-api';
import { ChatRepoApi } from '@domain/chat/repos/chat-repo-api';
import { TYPES } from './types';

const container = new Container();

container.bind(TYPES.IAuthRepo).to(AuthRepoApi);
container.bind(TYPES.IPagesRepo).to(PageRepoApi);
container.bind(TYPES.ICommentsRepo).to(CommentsRepoApi);
container.bind(TYPES.IVocabularyRepo).to(VocabularyRepoApi);
container.bind(TYPES.ISettingsRepo).to(SettingsRepoApi);
container.bind(TYPES.IChatRepo).to(ChatRepoApi);

export { container, TYPES };