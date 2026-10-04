import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import axios from 'axios';
import { apiClient } from '../../../core/api/api-client';
import type { IChatRepo } from './chat-repo';
import { 
    ChatAppError, 
    type ChatCompletionResult, 
    type ChatErrorDetails, 
    type ChatErrorType 
} from '../models/chat-types';

export class ChatRepoApi implements IChatRepo {
    async getChatCompletion(params: {
            modelId: string;
        systemPrompt: string;
        userPrompt: string;
        pageId?: string;
        actionType?: 'meaning' | 'explanation' | 'doubt';
        signal?: AbortSignal;
    }): AsyncResult<ChatCompletionResult, ChatAppError> {
        const { signal, ...body } = params;
        try {
            const { data } = await apiClient.post('/chat', body, { signal });
            return ok({
                response: data.response ?? '',
                rawResponse: data.rawResponse,
            });
        } catch (error: any) {
            if (axios.isCancel(error)) {
                return err(new ChatAppError({
                    errorType: 'CANCELLED',
                    message: 'Request cancelled',
                    description: 'The request was cancelled.',
                    rawError: { name: 'CanceledError', message: error.message },
                }, error));
            }

            const backendError = error?.response?.data?.error;
            if (backendError) {
                const details: ChatErrorDetails = {
                    errorType: (backendError.type as ChatErrorType) || 'UNKNOWN',
                    message: backendError.message || 'Couldn’t get a response. Try again.',
                    description: backendError.description,
                    status: error?.response?.status,
                    rawError: backendError.rawError || error?.response?.data,
                };
                return err(new ChatAppError(details, error));
            }

            const details: ChatErrorDetails = {
                errorType: 'UNKNOWN',
                message: error?.message || 'Couldn’t get a response. Try again.',
                description: error?.response?.statusText || 'Couldn’t reach the AI service. Check your connection and try again.',
                status: error?.response?.status,
                rawError: error?.response?.data || error?.message,
            };
            return err(new ChatAppError(details, error));
        }
    }
}
