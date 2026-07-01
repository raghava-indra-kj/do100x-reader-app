import type { ServiceIdentifier } from 'inversify';
import type { IAuthRepo } from '@domain/auth/repos/auth-repo';
import type { IPagesRepo } from '@domain/page/repos/pages-repo';
import type { ICommentsRepo } from '@domain/comment/repos/comments-repo';
import type { IVocabularyRepo } from '@domain/vocabulary/repos/vocabulary-repo';
import type { ISettingsRepo } from '@domain/settings/repos/settings-repo';
import type { IChatRepo } from '@domain/chat/repos/chat-repo';

export const TYPES = {
    IAuthRepo: Symbol.for('IAuthRepo') as ServiceIdentifier<IAuthRepo>,
    IPagesRepo: Symbol.for('IPagesRepo') as ServiceIdentifier<IPagesRepo>,
    ICommentsRepo: Symbol.for('ICommentsRepo') as ServiceIdentifier<ICommentsRepo>,
    IVocabularyRepo: Symbol.for('IVocabularyRepo') as ServiceIdentifier<IVocabularyRepo>,
    ISettingsRepo: Symbol.for('ISettingsRepo') as ServiceIdentifier<ISettingsRepo>,
    IChatRepo: Symbol.for('IChatRepo') as ServiceIdentifier<IChatRepo>,
};