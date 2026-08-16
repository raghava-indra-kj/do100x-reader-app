import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { ChatCompletionResult } from '../models/chat-types';

export interface IChatRepo {
    getChatCompletion(params: {
        userId: string;
        modelId: string;
        systemPrompt: string;
        userPrompt: string;
        pageId?: string;
        actionType?: 'meaning' | 'explanation' | 'doubt';
        signal?: AbortSignal;
    }): AsyncResult<ChatCompletionResult, AppError>;
}
