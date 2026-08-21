import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { ModelConfigData } from '../models/model-config';
import type { UserModelData } from '../models/user-model';

export interface ISettingsRepo {
    getModelConfig(): AsyncResult<ModelConfigData, AppError>;
    saveModelConfig(params: {
        baseUrl: string;
        apiKey: string;
        explanationModelId?: string;
        meaningModelId?: string;
        doubtModelId?: string;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<ModelConfigData, AppError>;
    getUserModels(): AsyncResult<UserModelData[], AppError>;
    createUserModel(params: { name: string; modelId: string; baseUrl?: string; apiKey?: string }): AsyncResult<string, AppError>;
    updateUserModel(params: { id: string; name: string; modelId: string; baseUrl?: string | null; apiKey?: string | null }): AsyncResult<void, AppError>;
    deleteUserModel(params: { id: string }): AsyncResult<void, AppError>;
}
