import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { ModelConfigSchema, type ModelConfigData } from '../models/model-config';
import { UserModelSchema, type UserModelData } from '../models/user-model';
import type { ISettingsRepo } from './settings-repo';

export class SettingsRepoApi implements ISettingsRepo {
    async getModelConfig({ userId }: { userId: string }): AsyncResult<ModelConfigData, AppError> {
        try {
            const { data } = await apiClient.get('/model-config', { params: { userId } });
            return ok(ModelConfigSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch model configuration'), cause: error }));
        }
    }

    async saveModelConfig(params: {
        userId: string;
        baseUrl: string;
        apiKey: string;
        explanationModelId?: string;
        meaningModelId?: string;
        doubtModelId?: string;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<ModelConfigData, AppError> {
        try {
            const { data } = await apiClient.post('/model-config', params);
            return ok(ModelConfigSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to save model configuration'), cause: error }));
        }
    }

    async getUserModels({ userId }: { userId: string }): AsyncResult<UserModelData[], AppError> {
        try {
            const { data } = await apiClient.get('/user-models', { params: { userId } });
            return ok((data as unknown[]).map(item => UserModelSchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch user models'), cause: error }));
        }
    }

    async createUserModel(params: { userId: string; name: string; modelId: string }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/user-models', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to add model'), cause: error }));
        }
    }

    async deleteUserModel({ id }: { id: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/user-models/${id}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete model'), cause: error }));
        }
    }
}
