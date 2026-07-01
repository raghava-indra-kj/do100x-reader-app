import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import type { IChatRepo } from './chat-repo';

export class ChatRepoApi implements IChatRepo {
    async getChatCompletion(params: {
        userId: string;
        modelId: string;
        systemPrompt: string;
        userPrompt: string;
        pageId?: string;
        actionType?: 'meaning' | 'explanation' | 'doubt';
    }): AsyncResult<{ response: string }, AppError> {
        try {
            const { data } = await apiClient.post('/chat', params);
            return ok(data as { response: string });
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'AI chat completion failed'), cause: error }));
        }
    }
}
