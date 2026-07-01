import { makeObservable, observable, action, runInAction } from 'mobx';
import { toast } from '@modules/core/ui/primitives/toast';
import { getModelConfig, saveModelConfig, getUserModels, createUserModel, deleteUserModel } from '@domain/settings/services/settings-service';
import type { UserModel } from '@domain/settings/models/user-model';

export class SettingsStore {
    readonly userId: string;

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

    isLoading: boolean = false;
    isSavingConfig: boolean = false;
    isAddingModel: boolean = false;
    deletingModelIds = new Set<string>();

    userModels: UserModel[] = [];

    constructor({ userId }: { userId: string }) {
        this.userId = userId;
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

    async load() {
        this.isLoading = true;
        
        // Load config
        const configRes = await getModelConfig({ userId: this.userId });
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
        const modelsRes = await getUserModels({ userId: this.userId });
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
            userId: this.userId,
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
            userId: this.userId,
            name: this.newModelNameInput.trim(),
            modelId: this.newModelIdInput.trim(),
        });
        
        if (res.ok) {
            // Reload models
            const modelsRes = await getUserModels({ userId: this.userId });
            runInAction(() => {
                this.isAddingModel = false;
                this.newModelNameInput = '';
                this.newModelIdInput = '';
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

    async deleteModel(id: string) {
        this.deletingModelIds.add(id);
        const res = await deleteUserModel({ id });
        if (res.ok) {
            const modelsRes = await getUserModels({ userId: this.userId });
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
