import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { ModelConfigSchema, type ModelConfigData } from '../models/model-config';
import { UserModelSchema, type UserModelData } from '../models/user-model';
import type { ISettingsRepo } from './settings-repo';

export class SettingsRepoApi implements ISettingsRepo {
    async getModelConfig(): AsyncResult<ModelConfigData, AppError> {
        try {
            const { data } = await apiClient.get('/model-config');
            return ok(ModelConfigSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load AI settings. Try again.'), cause: error }));
        }
    }

    async saveModelConfig(params: {
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
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save AI settings. Try again.'), cause: error }));
        }
    }

    async getUserModels(): AsyncResult<UserModelData[], AppError> {
        try {
            const { data } = await apiClient.get('/user-models');
            return ok((data as unknown[]).map(item => UserModelSchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load models. Try again.'), cause: error }));
        }
    }

    async createUserModel(params: { name: string; modelId: string; baseUrl?: string; apiKey?: string }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/user-models', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t add the model. Try again.'), cause: error }));
        }
    }

    async updateUserModel(params: { id: string; name: string; modelId: string; baseUrl?: string | null; apiKey?: string | null }): AsyncResult<void, AppError> {
        try {
            const { id, ...body } = params;
            await apiClient.put(`/user-models/${id}`, body);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save the model. Try again.'), cause: error }));
        }
    }

    async deleteUserModel({ id }: { id: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/user-models/${id}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t delete the model. Try again.'), cause: error }));
        }
    }
}
