import { useEffect, useMemo } from 'react';
import { Observer } from 'mobx-react-lite';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Input } from '@modules/core/ui/primitives/input';
import { FormLabel } from '@modules/core/ui/primitives/form-label';
import { Button } from '@modules/core/ui/primitives/button';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Select } from '@modules/core/ui/primitives/select';
import { SettingsStore } from './store';
import { Trash2 } from 'lucide-react';

export default function SettingsPage() {
    const authStore = useAuthStore();
    const store = useMemo(() => new SettingsStore({ userId: authStore.currentUser.id }), [authStore]);

    useEffect(() => {
        store.load();
    }, [store]);

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <AppBar />
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-8">
                    <h1 className="text-2xl font-semibold text-[var(--color-text-strong)] font-[family-name:var(--font-serif)]">Settings</h1>

                    {/* Loader */}
                    <Observer>
                        {() => store.isLoading ? (
                            <div className="flex justify-center py-12"><Loader size={32} /></div>
                        ) : (
                            <div className="space-y-6">
                                {/* Profile Section */}
                                <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                                    <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Profile</h2>
                                    <div>
                                        <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Logged in User</span>
                                        <p className="text-sm font-medium text-[var(--color-text-strong)] mt-0.5">{authStore.currentUser.username}</p>
                                    </div>
                                </section>

                                {/* AI Model Configuration Section */}
                                <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                                    <h2 className="text-base font-semibold text-[var(--color-text-strong)]">AI Model Configuration</h2>
                                    
                                    <div className="space-y-2">
                                        <FormLabel>Provider Base URL</FormLabel>
                                        <Input
                                            value={store.baseUrlInput}
                                            onValueChange={(v) => store.setBaseUrlInput(v)}
                                            placeholder="https://api.openai.com/v1"
                                        />
                                    </div>

                                    <div className="space-y-2 pb-2">
                                        <FormLabel>API Key</FormLabel>
                                        <Input
                                            type="password"
                                            value={store.apiKeyInput}
                                            onValueChange={(v) => store.setApiKeyInput(v)}
                                            placeholder="Enter provider API key"
                                        />
                                    </div>

                                    {/* Default Model Selects */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[var(--color-border-subtle)] pt-4 pb-2">
                                        <div className="space-y-2">
                                            <FormLabel>Model for Explanation</FormLabel>
                                            <Select
                                                value={store.explanationModelIdInput}
                                                onValueChange={(v) => store.setExplanationModelIdInput(v || '')}
                                                items={{
                                                    "": "None",
                                                    ...Object.fromEntries(store.userModels.map(m => [m.modelId, m.name]))
                                                }}
                                                placeholder="Select model"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <FormLabel>Model for Meanings</FormLabel>
                                            <Select
                                                value={store.meaningModelIdInput}
                                                onValueChange={(v) => store.setMeaningModelIdInput(v || '')}
                                                items={{
                                                    "": "None",
                                                    ...Object.fromEntries(store.userModels.map(m => [m.modelId, m.name]))
                                                }}
                                                placeholder="Select model"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <FormLabel>Model for Asking Doubts</FormLabel>
                                            <Select
                                                value={store.doubtModelIdInput}
                                                onValueChange={(v) => store.setDoubtModelIdInput(v || '')}
                                                items={{
                                                    "": "None",
                                                    ...Object.fromEntries(store.userModels.map(m => [m.modelId, m.name]))
                                                }}
                                                placeholder="Select model"
                                            />
                                        </div>
                                    </div>

                                    {/* Global Custom System Prompts */}
                                    <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-4 pb-2">
                                        <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Global System Prompts (Optional)</h3>
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <FormLabel>System Prompt for Explanation</FormLabel>
                                                <textarea
                                                    value={store.explanationSystemPromptInput}
                                                    onChange={(e) => store.setExplanationSystemPromptInput(e.target.value)}
                                                    placeholder="Specify custom system instructions for passage explanation..."
                                                    className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-16"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <FormLabel>System Prompt for Meanings</FormLabel>
                                                <textarea
                                                    value={store.meaningSystemPromptInput}
                                                    onChange={(e) => store.setMeaningSystemPromptInput(e.target.value)}
                                                    placeholder="Specify custom system instructions for word meanings..."
                                                    className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-16"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <FormLabel>System Prompt for Asking Doubts</FormLabel>
                                                <textarea
                                                    value={store.doubtSystemPromptInput}
                                                    onChange={(e) => store.setDoubtSystemPromptInput(e.target.value)}
                                                    placeholder="Specify custom system instructions for answering doubts..."
                                                    className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-16"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => store.saveConfig()}
                                        loading={store.isSavingConfig}
                                    >
                                        Save Configuration
                                    </Button>
                                </section>

                                {/* AI Models Section */}
                                <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-6">
                                    <h2 className="text-base font-semibold text-[var(--color-text-strong)]">AI Models</h2>

                                    {/* Saved models list */}
                                    <div className="space-y-2">
                                        {store.userModels.length === 0 ? (
                                            <p className="text-xs text-[var(--color-text-muted)]">No models added yet.</p>
                                        ) : (
                                            <div className="divide-y divide-[var(--color-border-subtle)]">
                                                {store.userModels.map((m) => (
                                                    <div key={m.id} className="flex items-center justify-between py-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-[var(--color-text-strong)] truncate">{m.name}</p>
                                                            <p className="text-xs text-[var(--color-text-muted)] truncate font-mono mt-0.5">{m.modelId}</p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            iconOnly
                                                            onClick={() => store.deleteModel(m.id)}
                                                            loading={store.deletingModelIds.has(m.id)}
                                                            tooltip="Delete model"
                                                        >
                                                            <Trash2 size={16} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-error)]" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Model Form */}
                                    <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-4">
                                        <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Add Model</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <FormLabel>Model Display Name</FormLabel>
                                                <Input
                                                    value={store.newModelNameInput}
                                                    onValueChange={(v) => store.setNewModelNameInput(v)}
                                                    placeholder="GPT-4o"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <FormLabel>Model ID</FormLabel>
                                                <Input
                                                    value={store.newModelIdInput}
                                                    onValueChange={(v) => store.setNewModelIdInput(v)}
                                                    placeholder="gpt-4o"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            variant="outlined"
                                            onClick={() => store.addModel()}
                                            loading={store.isAddingModel}
                                        >
                                            Add Model
                                        </Button>
                                    </div>
                                </section>
                            </div>
                        )}
                    </Observer>
                </div>
            </div>
        </div>
    );
}
