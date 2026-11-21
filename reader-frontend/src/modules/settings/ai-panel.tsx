import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { BookOpenText, ChevronDown, Eye, EyeOff, FilePenLine, Languages, MessageCircleQuestion, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { SettingsCopyButton } from './settings-copy-button';
import { SettingsStore } from './store';
import './ai-panel.css';

const configForm = 'ai-provider-settings';
const features = [
    { key: 'explanation', label: 'Explanations', icon: BookOpenText, prompt: 'How should the Reader explain passages?' },
    { key: 'meaning', label: 'Word meanings', icon: Languages, prompt: 'How should the Reader define words?' },
    { key: 'doubt', label: 'Questions', icon: MessageCircleQuestion, prompt: 'How should the Reader answer your questions?' },
    { key: 'format', label: 'Formatting', icon: FilePenLine, prompt: 'How should the Reader format your pages?' },
] as const;

function SecretField({ id, value, onChange, required = false, copy = false }: {
    id: string; value: string; onChange: (value: string) => void; required?: boolean; copy?: boolean;
}) {
    const [revealed, setRevealed] = useState(false);
    const revealLabel = revealed ? 'Hide API key' : 'Show API key';
    return <div className="settings-field ai-field">
        <label htmlFor={id}>API key</label>
        <div className="ai-secret-row">
            <div className="ai-secret-input">
                <Input id={id} type={revealed ? 'text' : 'password'} value={value} onValueChange={onChange}
                    required={required} autoComplete="off" autoCapitalize="none" spellCheck={false} />
                <button type="button" className="ai-icon-button" aria-label={revealLabel} title={revealLabel}
                    aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>
                    {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {copy && value && <SettingsCopyButton text={value} label="Copy API key" iconOnly
                fallbackHint="Clipboard unavailable. Show the API key to copy it manually." />}
        </div>
    </div>;
}

const ModelLibrary = observer(function ModelLibrary({ store }: { store: SettingsStore }) {
    const draft = store.modelDraft;
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const lastTrigger = useRef<HTMLButtonElement | null>(null);
    const focusName = useRef(false);
    const nameInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (draft && focusName.current) {
            nameInput.current?.focus();
            focusName.current = false;
        }
        if (!draft && lastTrigger.current) {
            lastTrigger.current.focus();
            lastTrigger.current = null;
        }
    }, [draft]);

    const edit = (trigger: HTMLButtonElement, model?: (typeof store.userModels)[number]) => {
        lastTrigger.current = trigger;
        focusName.current = true;
        setConfirmDelete(null);
        store.openModelEditor(model);
    };

    return <section className="settings-card ai-card" aria-labelledby="ai-models-heading">
        <div className="ai-heading-row">
            <h2 className="settings-card-heading" id="ai-models-heading">Saved models</h2>
            <button type="button" className="settings-action" disabled={!!draft || !!store.deletingModelId}
                onClick={e => edit(e.currentTarget)}><Plus size={15} /> Add model</button>
        </div>
        {!store.userModels.length && !draft && <p className="settings-description">Add a model to use it for a Reader feature.</p>}
        {store.userModels.length > 0 && <ul className="ai-model-list">{store.userModels.map(model => <li key={model.id}>
            <div className="ai-model-identity">
                <strong>{model.name}</strong><code>{model.modelId}</code>
                {model.baseUrl && <span>{model.baseUrl}</span>}
                {model.apiKey && <span>Custom API key</span>}
            </div>
            {confirmDelete === model.id
                ? <div className="ai-model-actions">
                    <Button type="button" size="sm" variant="ghost" disabled={!!store.deletingModelId} onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    <Button type="button" size="sm" variant="outlined" className="ai-danger" loading={store.deletingModelId === model.id}
                        onClick={async () => { await store.deleteModel(model.id); setConfirmDelete(null); }}>Delete model</Button>
                </div>
                : <div className="ai-model-actions">
                    <button type="button" className="ai-icon-button" disabled={!!draft || !!store.deletingModelId}
                        aria-label={`Edit ${model.name}`} title="Edit model" onClick={e => edit(e.currentTarget, model)}><Pencil size={15} /></button>
                    <button type="button" className="ai-icon-button" disabled={!!draft || !!store.deletingModelId}
                        aria-label={`Delete ${model.name}`} title="Delete model" onClick={() => setConfirmDelete(model.id)}><Trash2 size={15} /></button>
                </div>}
        </li>)}</ul>}
        {draft && <form className="ai-model-editor" onSubmit={e => { e.preventDefault(); void store.saveModel(); }}>
            <h3>{store.editingModelId ? 'Edit model' : 'New model'}</h3>
            <fieldset disabled={store.isSavingModel}>
                <div className="ai-fields-grid">
                    <div className="settings-field ai-field">
                        <label htmlFor="ai-model-name">Display name</label>
                        <Input id="ai-model-name" ref={nameInput} required value={draft.name} onValueChange={value => store.setModelValue('name', value)} />
                    </div>
                    <div className="settings-field ai-field">
                        <label htmlFor="ai-model-id">Model ID</label>
                        <Input id="ai-model-id" required value={draft.modelId} spellCheck={false} autoCapitalize="none"
                            onValueChange={value => store.setModelValue('modelId', value)} />
                    </div>
                </div>
                <details className="ai-overrides">
                    <summary><ChevronDown size={15} /> Custom connection <span>(optional)</span></summary>
                    <p className="settings-description">Empty fields use the default connection.</p>
                    <div className="ai-fields-grid">
                        <div className="settings-field ai-field">
                            <label htmlFor="ai-model-url">Provider URL</label>
                            <Input id="ai-model-url" type="url" value={draft.baseUrl} spellCheck={false} autoCapitalize="none"
                                onValueChange={value => store.setModelValue('baseUrl', value)} />
                        </div>
                        <SecretField id="ai-model-key" value={draft.apiKey} onChange={value => store.setModelValue('apiKey', value)} />
                    </div>
                </details>
            </fieldset>
            <div className="ai-model-actions">
                <Button type="button" variant="ghost" size="sm" disabled={store.isSavingModel} onClick={store.closeModelEditor}>Cancel</Button>
                <Button type="submit" size="sm" loading={store.isSavingModel}>{store.editingModelId ? 'Save model' : 'Add model'}</Button>
            </div>
        </form>}
    </section>;
});

const FeatureModels = observer(function FeatureModels({ store }: { store: SettingsStore }) {
    return <section className="settings-card ai-card" aria-labelledby="ai-features-heading">
        <h2 className="settings-card-heading" id="ai-features-heading">Reader features</h2>
        <p className="settings-description">Choose a model and customize its instructions for each feature.</p>
        <div className="ai-features">{features.map(({ key, label, icon: Icon, prompt }) => {
            const modelField = `${key}ModelId` as const;
            const promptField = `${key}SystemPrompt` as const;
            const selectedId = store.config[modelField];
            const selected = store.userModels.find(model => model.id === selectedId)
                ?? store.userModels.find(model => model.modelId === selectedId);
            return <details className="ai-feature" key={key}>
                <summary>
                    <Icon size={17} aria-hidden="true" /><strong>{label}</strong>
                    <span className="ai-assignment">{selected?.name || selectedId || 'Unassigned'}</span>
                    <ChevronDown size={15} className="ai-chevron" aria-hidden="true" />
                </summary>
                <fieldset className="ai-feature-fields" disabled={store.isSavingConfig}>
                    <div className="settings-field ai-field">
                        <label htmlFor={`ai-${key}-model`}>Model</label>
                        <select id={`ai-${key}-model`} form={configForm} value={selected?.id ?? selectedId} onChange={e => store.setConfigValue(modelField, e.target.value)}>
                            <option value="">Unassigned</option>
                            {selectedId && !selected && <option value={selectedId}>{selectedId}</option>}
                            {store.userModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                        </select>
                    </div>
                    <div className="settings-field ai-field">
                        <label htmlFor={`ai-${key}-instructions`}>Custom instructions <span>(optional)</span></label>
                        <textarea id={`ai-${key}-instructions`} form={configForm} rows={3} value={store.config[promptField]}
                            placeholder={prompt} onChange={e => store.setConfigValue(promptField, e.target.value)} />
                    </div>
                </fieldset>
            </details>;
        })}</div>
    </section>;
});

export const AiPanel = observer(function AiPanel({ store }: { store: SettingsStore }) {
    useEffect(() => { void store.load(); }, [store]);
    if (store.loadError) return <div className="settings-card ai-load-error">
        <p role="alert">{store.loadError}</p><button type="button" className="settings-action" onClick={store.load}>Retry</button>
    </div>;
    if (!store.loaded) return <div className="ai-loading" role="status"><Loader size={21} /> Loading AI settings…</div>;

    return <div className="settings-panel ai-panel">
        <section className="settings-card ai-card" aria-labelledby="ai-provider-heading">
            <h2 className="settings-card-heading" id="ai-provider-heading">Default connection</h2>
            <form id={configForm} onSubmit={e => { e.preventDefault(); void store.saveConfig(); }}>
                <fieldset className="ai-fields-grid" disabled={store.isSavingConfig}>
                    <div className="settings-field ai-field">
                        <label htmlFor="ai-provider-url">Provider URL</label>
                        <Input id="ai-provider-url" type="url" placeholder="https://api.openai.com/v1" required spellCheck={false}
                            autoCapitalize="none" value={store.config.baseUrl} onValueChange={value => store.setConfigValue('baseUrl', value)} />
                    </div>
                    <SecretField id="ai-provider-key" value={store.config.apiKey} required copy onChange={value => store.setConfigValue('apiKey', value)} />
                </fieldset>
            </form>
        </section>
        <ModelLibrary store={store} />
        <FeatureModels store={store} />
        {store.configChanged && <div className="ai-save-bar">
            <span role="status">Unsaved AI settings</span>
            <Button type="submit" form={configForm} size="sm" loading={store.isSavingConfig}>Save changes</Button>
        </div>}
    </div>;
});
