import { AppError } from '../../../core/errors/app-error';

export type ChatErrorType = 
    | 'INVALID_API_KEY' 
    | 'MODEL_NOT_FOUND' 
    | 'RATE_LIMIT' 
    | 'CONFIG_ERROR' 
    | 'NETWORK_ERROR' 
    | 'PROVIDER_ERROR' 
    | 'CANCELLED' 
    | 'UNKNOWN';

export interface ChatErrorDetails {
    errorType: ChatErrorType;
    message: string;
    description?: string;
    status?: number;
    rawError?: any;
}

export interface ChatCompletionResult {
    response: string;
    rawResponse?: any;
}

export class ChatAppError extends AppError {
    details: ChatErrorDetails;

    constructor(details: ChatErrorDetails, cause?: unknown) {
        super({
            message: details.message,
            errorCode: details.errorType,
            cause,
        });
        this.name = 'ChatAppError';
        this.details = details;
    }
}
