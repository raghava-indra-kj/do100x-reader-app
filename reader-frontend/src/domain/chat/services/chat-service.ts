import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { IChatRepo } from '../repos/chat-repo';
import { container, TYPES } from '@di/container';

export async function getChatCompletion(params: {
    userId: string;
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
    pageId?: string;
    actionType?: 'meaning' | 'explanation' | 'doubt';
}): AsyncResult<{ response: string }, AppError> {
    const repo = container.get<IChatRepo>(TYPES.IChatRepo);
    return repo.getChatCompletion(params);
}
