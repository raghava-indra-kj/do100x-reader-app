import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { IChatRepo } from '../repos/chat-repo';
import type { ChatCompletionResult } from '../models/chat-types';
import { container, TYPES } from '@di/container';

export async function getChatCompletion(params: {
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
    pageId?: string;
    actionType?: 'meaning' | 'explanation' | 'doubt';
    signal?: AbortSignal;
}): AsyncResult<ChatCompletionResult, AppError> {
    const repo = container.get<IChatRepo>(TYPES.IChatRepo);
    return repo.getChatCompletion(params);
}
