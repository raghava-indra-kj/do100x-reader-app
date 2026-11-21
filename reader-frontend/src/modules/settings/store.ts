import { makeAutoObservable, runInAction } from 'mobx';
import { isAxiosError } from 'axios';
import { toast } from '@modules/core/ui/primitives/toast';
import { getModelConfig, saveModelConfig, getUserModels, createUserModel, updateUserModel, deleteUserModel } from '@domain/settings/services/settings-service';
import type { UserModel } from '@domain/settings/models/user-model';
import type { ModelConfig } from '@domain/settings/models/model-config';

const configDefaults = {
    baseUrl: '', apiKey: '',
    explanationModelId: '', meaningModelId: '', doubtModelId: '', formatModelId: '',
    explanationSystemPrompt: '', meaningSystemPrompt: '', doubtSystemPrompt: '', formatSystemPrompt: '',
};

type ConfigDraft = typeof configDefaults;
const configKeys = Object.keys(configDefaults) as (keyof ConfigDraft)[];
const emptyModel = { name: '', modelId: '', baseUrl: '', apiKey: '' };
export type ModelDraft = typeof emptyModel;
type SavedModel = Omit<UserModel, 'userId'>;

function configDraft(config?: ModelConfig): ConfigDraft {
    const draft = { ...configDefaults };
    if (config) {
        for (const key of configKeys) draft[key] = config[key] ?? '';
    }
    return draft;
}

export class SettingsStore {
    config = configDraft();
    savedConfig = configDraft();
    userModels: SavedModel[] = [];
    loaded = false;
    isLoading = false;
    loadError = '';
    isSavingConfig = false;
    modelDraft: ModelDraft | null = null;
    editingModelId: string | null = null;
    isSavingModel = false;
    deletingModelId: string | null = null;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    get configChanged() {
        return configKeys.some(key => this.config[key] !== this.savedConfig[key]);
    }

    setConfigValue(key: keyof ConfigDraft, value: string) {
        this.config[key] = value;
    }

    async load() {
        if (this.isLoading || this.loaded) return;
        this.isLoading = true;
        this.loadError = '';
        const [config, models] = await Promise.all([getModelConfig(), getUserModels()]);
        runInAction(() => {
            this.isLoading = false;
            // A new account has no provider record until the first save.
            if (!config.ok && !(isAxiosError(config.error.cause) && config.error.cause.response?.status === 404)) {
                this.loadError = config.error.message;
                return;
            }
            if (!models.ok) {
                this.loadError = models.error.message;
                return;
            }
            this.config = configDraft(config.ok ? config.data : undefined);
            this.savedConfig = { ...this.config };
            this.userModels = models.data;
            this.loaded = true;
        });
    }

    async saveConfig() {
        if (this.isSavingConfig || !this.loaded || !this.configChanged) return;
        if (!this.config.baseUrl.trim() || !this.config.apiKey.trim()) {
            toast.error('Enter a provider URL and API key.');
            return;
        }
        this.isSavingConfig = true;
        const submitted = { ...this.config, baseUrl: this.config.baseUrl.trim(), apiKey: this.config.apiKey.trim() };
        // Explicit empty values clear previously saved model assignments and instructions.
        const result = await saveModelConfig(submitted);
        runInAction(() => {
            this.isSavingConfig = false;
            if (!result.ok) {
                toast.error(result.error.message);
                return;
            }
            this.savedConfig = submitted;
            this.config.baseUrl = submitted.baseUrl;
            this.config.apiKey = submitted.apiKey;
            toast.success('AI settings saved');
        });
    }

    openModelEditor(model?: SavedModel) {
        this.editingModelId = model?.id ?? null;
        this.modelDraft = model
            ? { name: model.name, modelId: model.modelId, baseUrl: model.baseUrl ?? '', apiKey: model.apiKey ?? '' }
            : { ...emptyModel };
    }

    setModelValue(key: keyof ModelDraft, value: string) {
        if (this.modelDraft) this.modelDraft[key] = value;
    }

    closeModelEditor() {
        this.editingModelId = null;
        this.modelDraft = null;
    }

    async saveModel() {
        if (!this.modelDraft || this.isSavingModel) return;
        const name = this.modelDraft.name.trim();
        const modelId = this.modelDraft.modelId.trim();
        if (!name || !modelId) {
            toast.error('Enter a display name and model ID.');
            return;
        }
        const baseUrl = this.modelDraft.baseUrl.trim() || null;
        const apiKey = this.modelDraft.apiKey.trim() || null;
        const existing = this.userModels.find(model => model.id === this.editingModelId);
        this.isSavingModel = true;
        const result = existing
            ? await updateUserModel({ id: existing.id, name, modelId, baseUrl, apiKey })
            : await createUserModel({ name, modelId, baseUrl: baseUrl ?? undefined, apiKey: apiKey ?? undefined });
        runInAction(() => {
            this.isSavingModel = false;
            if (!result.ok) {
                toast.error(result.error.message);
                return;
            }
            const fields = { name, modelId, baseUrl: baseUrl ?? undefined, apiKey: apiKey ?? undefined };
            if (existing) {
                this.userModels = this.userModels.map(model => model.id === existing.id ? { id: existing.id, ...fields } : model);
            } else if (typeof result.data === 'string') {
                this.userModels.push({ id: result.data, ...fields });
            }
            this.closeModelEditor();
            toast.success(existing ? 'Model updated' : 'Model added');
        });
    }

    async deleteModel(id: string) {
        if (this.deletingModelId) return;
        this.deletingModelId = id;
        const result = await deleteUserModel({ id });
        runInAction(() => {
            this.deletingModelId = null;
            if (result.ok) {
                this.userModels = this.userModels.filter(model => model.id !== id);
                toast.success('Model deleted');
            } else {
                toast.error(result.error.message);
            }
        });
    }
}
