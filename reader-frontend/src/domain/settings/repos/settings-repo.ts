import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { ModelConfigData } from '../models/model-config';
import type { UserModelData } from '../models/user-model';

export interface ISettingsRepo {
    getModelConfig(params: { userId: string }): AsyncResult<ModelConfigData, AppError>;
    saveModelConfig(params: {
        userId: string;
        baseUrl: string;
        apiKey: string;
        explanationModelId?: string;
        meaningModelId?: string;
        doubtModelId?: string;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<ModelConfigData, AppError>;
    getUserModels(params: { userId: string }): AsyncResult<UserModelData[], AppError>;
    createUserModel(params: { userId: string; name: string; modelId: string }): AsyncResult<string, AppError>;
    deleteUserModel(params: { id: string }): AsyncResult<void, AppError>;
}
