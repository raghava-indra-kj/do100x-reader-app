import { makeObservable, observable, action, runInAction } from 'mobx';
import { toast } from '@modules/core/ui/primitives/toast';
import { getModelConfig, saveModelConfig, getUserModels, createUserModel, updateUserModel, deleteUserModel } from '@domain/settings/services/settings-service';
import type { UserModel } from '@domain/settings/models/user-model';

export class SettingsStore {
    baseUrlInput: string = '';
    apiKeyInput: string = '';
    
    explanationModelIdInput: string = '';
    meaningModelIdInput: string = '';
    doubtModelIdInput: string = '';

    meaningSystemPromptInput: string = '';
    explanationSystemPromptInput: string = '';
    doubtSystemPromptInput: string = '';
    
    newModelNameInput: string = '';
    newModelIdInput: string = '';
    newModelBaseUrlInput: string = '';
    newModelApiKeyInput: string = '';

    // Edit model state
    editingModelId: string | null = null;
    editModelNameInput: string = '';
    editModelIdInput: string = '';
    editModelBaseUrlInput: string = '';
    editModelApiKeyInput: string = '';
    isUpdatingModel: boolean = false;

    isLoading: boolean = false;
    isSavingConfig: boolean = false;
    isAddingModel: boolean = false;
    deletingModelIds = new Set<string>();

    userModels: UserModel[] = [];

    constructor() {
        makeObservable(this, {
            baseUrlInput: observable,
            apiKeyInput: observable,
            explanationModelIdInput: observable,
            meaningModelIdInput: observable,
            doubtModelIdInput: observable,
            meaningSystemPromptInput: observable,
            explanationSystemPromptInput: observable,
            doubtSystemPromptInput: observable,
            newModelNameInput: observable,
            newModelIdInput: observable,
            newModelBaseUrlInput: observable,
            newModelApiKeyInput: observable,
            editingModelId: observable,
            editModelNameInput: observable,
            editModelIdInput: observable,
            editModelBaseUrlInput: observable,
            editModelApiKeyInput: observable,
            isUpdatingModel: observable,
            isLoading: observable,
            isSavingConfig: observable,
            isAddingModel: observable,
            deletingModelIds: observable,
            userModels: observable,
            
            setBaseUrlInput: action,
            setApiKeyInput: action,
            setExplanationModelIdInput: action,
            setMeaningModelIdInput: action,
            setDoubtModelIdInput: action,
            setMeaningSystemPromptInput: action,
            setExplanationSystemPromptInput: action,
            setDoubtSystemPromptInput: action,
            setNewModelNameInput: action,
            setNewModelIdInput: action,
            setNewModelBaseUrlInput: action,
            setNewModelApiKeyInput: action,
            startEditingModel: action,
            cancelEditingModel: action,
            setEditModelNameInput: action,
            setEditModelIdInput: action,
            setEditModelBaseUrlInput: action,
            setEditModelApiKeyInput: action,
            updateModel: action,
            load: action,
            saveConfig: action,
            addModel: action,
            deleteModel: action,
        });
    }

    setBaseUrlInput(val: string) { this.baseUrlInput = val; }
    setApiKeyInput(val: string) { this.apiKeyInput = val; }
    setExplanationModelIdInput(val: string) { this.explanationModelIdInput = val; }
    setMeaningModelIdInput(val: string) { this.meaningModelIdInput = val; }
    setDoubtModelIdInput(val: string) { this.doubtModelIdInput = val; }
    setMeaningSystemPromptInput(val: string) { this.meaningSystemPromptInput = val; }
    setExplanationSystemPromptInput(val: string) { this.explanationSystemPromptInput = val; }
    setDoubtSystemPromptInput(val: string) { this.doubtSystemPromptInput = val; }
    setNewModelNameInput(val: string) { this.newModelNameInput = val; }
    setNewModelIdInput(val: string) { this.newModelIdInput = val; }
    setNewModelBaseUrlInput(val: string) { this.newModelBaseUrlInput = val; }
    setNewModelApiKeyInput(val: string) { this.newModelApiKeyInput = val; }

    startEditingModel(model: UserModel) {
        this.editingModelId = model.id;
        this.editModelNameInput = model.name;
        this.editModelIdInput = model.modelId;
        this.editModelBaseUrlInput = model.baseUrl ?? '';
        this.editModelApiKeyInput = model.apiKey ?? '';
    }

    cancelEditingModel() {
        this.editingModelId = null;
        this.editModelNameInput = '';
        this.editModelIdInput = '';
        this.editModelBaseUrlInput = '';
        this.editModelApiKeyInput = '';
    }

    setEditModelNameInput(val: string) { this.editModelNameInput = val; }
    setEditModelIdInput(val: string) { this.editModelIdInput = val; }
    setEditModelBaseUrlInput(val: string) { this.editModelBaseUrlInput = val; }
    setEditModelApiKeyInput(val: string) { this.editModelApiKeyInput = val; }

    async load() {
        this.isLoading = true;
        
        // Load config
        const configRes = await getModelConfig();
        runInAction(() => {
            if (configRes.ok) {
                this.baseUrlInput = configRes.data.baseUrl;
                this.apiKeyInput = configRes.data.apiKey;
                this.explanationModelIdInput = configRes.data.explanationModelId ?? '';
                this.meaningModelIdInput = configRes.data.meaningModelId ?? '';
                this.doubtModelIdInput = configRes.data.doubtModelId ?? '';
                this.meaningSystemPromptInput = configRes.data.meaningSystemPrompt ?? '';
                this.explanationSystemPromptInput = configRes.data.explanationSystemPrompt ?? '';
                this.doubtSystemPromptInput = configRes.data.doubtSystemPrompt ?? '';
            }
        });

        // Load user models
        const modelsRes = await getUserModels();
        runInAction(() => {
            this.isLoading = false;
            if (modelsRes.ok) {
                this.userModels = modelsRes.data;
            }
        });
    }

    async saveConfig() {
        if (!this.baseUrlInput.trim() || !this.apiKeyInput.trim()) {
            toast.error('Base URL and API Key are required');
            return;
        }
        this.isSavingConfig = true;
        const res = await saveModelConfig({
            baseUrl: this.baseUrlInput.trim(),
            apiKey: this.apiKeyInput.trim(),
            explanationModelId: this.explanationModelIdInput || undefined,
            meaningModelId: this.meaningModelIdInput || undefined,
            doubtModelId: this.doubtModelIdInput || undefined,
            meaningSystemPrompt: this.meaningSystemPromptInput || undefined,
            explanationSystemPrompt: this.explanationSystemPromptInput || undefined,
            doubtSystemPrompt: this.doubtSystemPromptInput || undefined,
        });
        runInAction(() => {
            this.isSavingConfig = false;
            if (res.ok) {
                toast.success('AI configuration saved successfully');
            } else {
                toast.error(res.error.message);
            }
        });
    }

    async addModel() {
        if (!this.newModelNameInput.trim() || !this.newModelIdInput.trim()) {
            toast.error('Model Name and Model ID are required');
            return;
        }
        this.isAddingModel = true;
        const res = await createUserModel({
            name: this.newModelNameInput.trim(),
            modelId: this.newModelIdInput.trim(),
            baseUrl: this.newModelBaseUrlInput.trim() || undefined,
            apiKey: this.newModelApiKeyInput.trim() || undefined,
        });
        
        if (res.ok) {
            // Reload models
            const modelsRes = await getUserModels();
            runInAction(() => {
                this.isAddingModel = false;
                this.newModelNameInput = '';
                this.newModelIdInput = '';
                this.newModelBaseUrlInput = '';
                this.newModelApiKeyInput = '';
                if (modelsRes.ok) {
                    this.userModels = modelsRes.data;
                }
                toast.success('Model added successfully');
            });
        } else {
            runInAction(() => { this.isAddingModel = false; });
            toast.error(res.error.message);
        }
    }

    async updateModel() {
        if (!this.editingModelId) return;
        if (!this.editModelNameInput.trim() || !this.editModelIdInput.trim()) {
            toast.error('Model Name and Model ID are required');
            return;
        }
        this.isUpdatingModel = true;
        const res = await updateUserModel({
            id: this.editingModelId,
            name: this.editModelNameInput.trim(),
            modelId: this.editModelIdInput.trim(),
            baseUrl: this.editModelBaseUrlInput.trim() || null,
            apiKey: this.editModelApiKeyInput.trim() || null,
        });

        if (res.ok) {
            const modelsRes = await getUserModels();
            runInAction(() => {
                this.isUpdatingModel = false;
                this.editingModelId = null;
                if (modelsRes.ok) {
                    this.userModels = modelsRes.data;
                }
                toast.success('Model updated successfully');
            });
        } else {
            runInAction(() => { this.isUpdatingModel = false; });
            toast.error(res.error.message);
        }
    }

    async deleteModel(id: string) {
        this.deletingModelIds.add(id);
        const res = await deleteUserModel({ id });
        if (res.ok) {
            const modelsRes = await getUserModels();
            runInAction(() => {
                this.deletingModelIds.delete(id);
                if (modelsRes.ok) {
                    this.userModels = modelsRes.data;
                }
                toast.success('Model deleted successfully');
            });
        } else {
            runInAction(() => { this.deletingModelIds.delete(id); });
            toast.error(res.error.message);
        }
    }
}
