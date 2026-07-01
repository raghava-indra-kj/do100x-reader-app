import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';

export interface IChatRepo {
    getChatCompletion(params: {
        userId: string;
        modelId: string;
        systemPrompt: string;
        userPrompt: string;
        pageId?: string;
        actionType?: 'meaning' | 'explanation' | 'doubt';
    }): AsyncResult<{ response: string }, AppError>;
}
