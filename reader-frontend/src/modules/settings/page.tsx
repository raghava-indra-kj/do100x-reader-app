import { useEffect, useMemo, useState } from 'react';
import { Observer } from 'mobx-react-lite';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Input } from '@modules/core/ui/primitives/input';
import { FormLabel } from '@modules/core/ui/primitives/form-label';
import { Button } from '@modules/core/ui/primitives/button';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Select } from '@modules/core/ui/primitives/select';
import { SettingsStore } from './store';
import { Trash2, Eye, EyeOff, Copy, Check, Hourglass, FileCode } from 'lucide-react';
import { getLifePerspectiveConfig, saveLifePerspectiveConfig } from '@modules/core/utils/time-perspective';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';

export default function SettingsPage() {
    const authStore = useAuthStore();
    const store = useMemo(() => new SettingsStore({ userId: authStore.currentUser.id }), [authStore]);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [copiedApiKey, setCopiedApiKey] = useState(false);
    const [copiedGuide, setCopiedGuide] = useState(false);

    // Life Perspective & Memento Mori State
    const [dob, setDob] = useState(() => getLifePerspectiveConfig().dob);
    const [lifespan, setLifespan] = useState(() => String(getLifePerspectiveConfig().lifespanYears));
    const [lifeSaved, setLifeSaved] = useState(false);

    const handleSaveLifePerspective = (newDob?: string, newLifespan?: string) => {
        const d = newDob !== undefined ? newDob : dob;
        const l = newLifespan !== undefined ? newLifespan : lifespan;
        const parsedLifespan = parseInt(l, 10) || 80;
        saveLifePerspectiveConfig({
            dob: d,
            lifespanYears: Math.max(1, Math.min(130, parsedLifespan)),
        });
        setLifeSaved(true);
        setTimeout(() => setLifeSaved(false), 1500);
    };

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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Logged in User</span>
                                            <p className="text-sm font-medium text-[var(--color-text-strong)] mt-1">{authStore.currentUser.username}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Password</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm font-mono text-[var(--color-text-strong)] bg-[var(--color-surface-canvas)] px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-border-default)] select-all min-w-[140px]">
                                                    {showPassword ? (authStore.currentUser.password || '(no password set)') : '••••••••••••'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                    className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                                                    title={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                                {authStore.currentUser.password && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(authStore.currentUser.password);
                                                            setCopiedPassword(true);
                                                            setTimeout(() => setCopiedPassword(false), 1500);
                                                        }}
                                                        className={`p-1.5 rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                                                            copiedPassword
                                                                ? 'text-[var(--color-brand)] bg-[var(--color-surface-hover)]'
                                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)]'
                                                        }`}
                                                        title={copiedPassword ? "Copied!" : "Copy password"}
                                                    >
                                                        {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Life Perspective & Time Awareness Section */}
                                <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                                <Hourglass size={15} />
                                            </div>
                                            <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Life Perspective &amp; Time Awareness</h2>
                                        </div>
                                        {lifeSaved && (
                                            <span className="flex items-center gap-1 text-xs text-[var(--color-brand)] font-medium animate-fade-in">
                                                <Check size={14} /> Saved
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                        Configure your date of birth and estimated lifespan to see your real-time remaining minutes live on the <strong>Inspirations &amp; Perspective</strong> screen.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                        <div className="space-y-2">
                                            <FormLabel>Date of Birth</FormLabel>
                                            <Input
                                                type="date"
                                                value={dob}
                                                onChange={(e) => {
                                                    setDob(e.target.value);
                                                    handleSaveLifePerspective(e.target.value, undefined);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <FormLabel>Expected Lifespan (Years)</FormLabel>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={130}
                                                value={lifespan}
                                                onChange={(e) => {
                                                    setLifespan(e.target.value);
                                                    handleSaveLifePerspective(undefined, e.target.value);
                                                }}
                                                placeholder="80"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Markdown LLM Formatting Guide Section */}
                                <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                                <FileCode size={15} />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Markdown LLM Guide (format.llm.md)</h2>
                                                <p className="text-xs text-[var(--color-text-muted)]">Prompt instructions &amp; frontmatter schema for AI-generated pages</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outlined"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(FORMAT_LLM_MD_CONTENT);
                                                setCopiedGuide(true);
                                                setTimeout(() => setCopiedGuide(false), 1800);
                                            }}
                                            className="flex items-center gap-1.5"
                                        >
                                            {copiedGuide ? <Check size={14} className="text-[var(--color-brand)]" /> : <Copy size={14} />}
                                            <span>{copiedGuide ? 'Copied' : 'Copy format.llm.md'}</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                        Pass this format guide to LLMs to generate properly formatted markdown pages with required frontmatter titles, ATX headings, Callouts, Details, Mermaid, and D2 diagrams.
                                    </p>
                                    <div className="relative">
                                        <pre className="p-3.5 rounded-xl bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] text-[11px] font-mono text-[var(--color-text-body)] max-h-44 overflow-y-auto scrollbar-none whitespace-pre-wrap leading-relaxed select-all">
                                            {FORMAT_LLM_MD_CONTENT}
                                        </pre>
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
                                        <div className="flex items-center justify-between">
                                            <FormLabel>API Key</FormLabel>
                                            {store.apiKeyInput && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowApiKey((prev) => !prev)}
                                                        className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                                                    >
                                                        {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                                                        <span>{showApiKey ? 'Hide' : 'Show'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(store.apiKeyInput);
                                                            setCopiedApiKey(true);
                                                            setTimeout(() => setCopiedApiKey(false), 1500);
                                                        }}
                                                        className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                                                    >
                                                        {copiedApiKey ? <Check size={13} className="text-[var(--color-brand)]" /> : <Copy size={13} />}
                                                        <span>{copiedApiKey ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative flex items-center">
                                            <Input
                                                type={showApiKey ? "text" : "password"}
                                                value={store.apiKeyInput}
                                                onValueChange={(v) => store.setApiKeyInput(v)}
                                                placeholder="Enter provider API key"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey((prev) => !prev)}
                                                className="absolute right-2.5 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                                                title={showApiKey ? "Hide API key" : "Show API key"}
                                            >
                                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
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
