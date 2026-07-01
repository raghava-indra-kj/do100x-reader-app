import type { AsyncResult } from '@raghava.indra/result-ts';
import { ok } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import { ModelConfig, type ModelConfigData } from '../models/model-config';
import { UserModel, type UserModelData } from '../models/user-model';
import type { ISettingsRepo } from '../repos/settings-repo';
import { container, TYPES } from '@di/container';

function toModelConfig(data: ModelConfigData): ModelConfig {
    return new ModelConfig(data);
}

function toUserModel(data: UserModelData): UserModel {
    return new UserModel(data);
}

export async function getModelConfig(params: { userId: string }): AsyncResult<ModelConfig, AppError> {
    const repo = container.get<ISettingsRepo>(TYPES.ISettingsRepo);
    const result = await repo.getModelConfig(params);
    if (!result.ok) return result;
    return ok(toModelConfig(result.data));
}

export async function saveModelConfig(params: {
    userId: string;
    baseUrl: string;
    apiKey: string;
    explanationModelId?: string;
    meaningModelId?: string;
    doubtModelId?: string;
    meaningSystemPrompt?: string;
    explanationSystemPrompt?: string;
    doubtSystemPrompt?: string;
}): AsyncResult<ModelConfig, AppError> {
    const repo = container.get<ISettingsRepo>(TYPES.ISettingsRepo);
    const result = await repo.saveModelConfig(params);
    if (!result.ok) return result;
    return ok(toModelConfig(result.data));
}

export async function getUserModels(params: { userId: string }): AsyncResult<UserModel[], AppError> {
    const repo = container.get<ISettingsRepo>(TYPES.ISettingsRepo);
    const result = await repo.getUserModels(params);
    if (!result.ok) return result;
    return ok(result.data.map(toUserModel));
}

export async function createUserModel(params: { userId: string; name: string; modelId: string }): AsyncResult<string, AppError> {
    const repo = container.get<ISettingsRepo>(TYPES.ISettingsRepo);
    return repo.createUserModel(params);
}

export async function deleteUserModel(params: { id: string }): AsyncResult<void, AppError> {
    const repo = container.get<ISettingsRepo>(TYPES.ISettingsRepo);
    return repo.deleteUserModel(params);
}
