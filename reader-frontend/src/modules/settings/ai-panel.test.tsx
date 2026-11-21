// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsStore } from './store';
import { AiPanel } from './ai-panel';

const service = vi.hoisted(() => ({
    getModelConfig: vi.fn(), saveModelConfig: vi.fn(), getUserModels: vi.fn(),
    createUserModel: vi.fn(), updateUserModel: vi.fn(), deleteUserModel: vi.fn(),
}));
vi.mock('@domain/settings/services/settings-service', () => service);
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const model = { id: 'model-1', name: 'Fast model', modelId: 'fast-v1' };
const config = { baseUrl: 'https://example.test/v1', apiKey: 'test-key', explanationModelId: 'fast-v1', explanationSystemPrompt: 'Concise, please.' };

beforeEach(() => {
    vi.resetAllMocks();
    service.getModelConfig.mockResolvedValue({ ok: true, data: config });
    service.getUserModels.mockResolvedValue({ ok: true, data: [model] });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('AI settings', () => {
    it('retains drafts and loads once when the settings section is reopened', async () => {
        service.getModelConfig.mockResolvedValueOnce({ ok: true, data: { ...config, meaningModelId: 'model-1', formatModelId: 'external-v2' } });
        service.getUserModels.mockResolvedValueOnce({ ok: true, data: [model, { ...model, id: 'model-2', name: 'Second provider' }] });
        const store = new SettingsStore();
        const root = createRoot(document.body.appendChild(document.createElement('div')));
        try {
            await act(async () => root.render(<AiPanel store={store} />));
            const detail = [...document.querySelectorAll('details')].find(row => row.textContent?.includes('Explanations'))!;
            expect(detail.open).toBe(false);
            expect(detail.querySelector('summary')?.textContent).toContain('Fast model');
            expect(document.querySelectorAll('.ai-feature')).toHaveLength(4);
            const legacy = document.querySelector<HTMLSelectElement>('#ai-meaning-model')!;
            expect(legacy.selectedOptions[0].text).toBe('Fast model');
            expect(legacy.options).toHaveLength(3);
            await act(async () => {
                legacy.value = 'model-2';
                legacy.dispatchEvent(new Event('change', { bubbles: true }));
            });
            expect(store.config.meaningModelId).toBe('model-2');
            expect(document.querySelector<HTMLSelectElement>('#ai-format-model')?.value).toBe('external-v2');
            const key = document.querySelector<HTMLInputElement>('#ai-provider-key')!;
            expect(key.type).toBe('password');
            await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Show API key"]')!.click());
            expect(key.type).toBe('text');
            await act(async () => {
                store.setConfigValue('meaningSystemPrompt', 'Give an example.');
                store.openModelEditor(model);
                store.setModelValue('name', 'My unfinished edit');
            });
            await act(async () => root.render(null));
            await act(async () => root.render(<AiPanel store={store} />));
            expect(service.getModelConfig).toHaveBeenCalledTimes(1);
            expect(document.querySelector<HTMLTextAreaElement>('#ai-meaning-instructions')?.value).toBe('Give an example.');
            expect(document.querySelector<HTMLInputElement>('#ai-model-name')?.value).toBe('My unfinished edit');
            expect(document.querySelector<HTMLInputElement>('#ai-provider-key')?.type).toBe('password');
            expect(document.querySelector('.ai-save-bar')?.textContent).toContain('Unsaved AI settings');
        } finally { await act(async () => root.unmount()); }
    });

    it('saves all four feature settings, including explicit clears, and retains edits after a failed save', async () => {
        const store = new SettingsStore();
        await store.load();
        store.setConfigValue('explanationModelId', '');
        store.setConfigValue('explanationSystemPrompt', '');
        store.setConfigValue('meaningModelId', 'fast-v1');
        store.setConfigValue('doubtModelId', 'fast-v1');
        store.setConfigValue('formatSystemPrompt', 'Keep equations');
        service.saveModelConfig.mockResolvedValueOnce({ ok: false, error: { message: 'Try again.' } });
        await store.saveConfig();
        expect(store.configChanged).toBe(true);
        service.saveModelConfig.mockResolvedValueOnce({ ok: true, data: store.config });
        await store.saveConfig();
        expect(service.saveModelConfig).toHaveBeenLastCalledWith({
            baseUrl: config.baseUrl, apiKey: config.apiKey, explanationModelId: '', explanationSystemPrompt: '',
            meaningModelId: 'fast-v1', meaningSystemPrompt: '', doubtModelId: 'fast-v1', doubtSystemPrompt: '',
            formatModelId: '', formatSystemPrompt: 'Keep equations',
        });
        expect(store.configChanged).toBe(false);
    });

    it('accepts the first-run configuration response and retries a real load failure', async () => {
        const store = new SettingsStore();
        service.getModelConfig.mockResolvedValueOnce({ ok: false, error: { message: 'Connection unavailable' } });
        await store.load();
        expect(store.loadError).toBe('Connection unavailable');
        expect(store.loaded).toBe(false);
        service.getModelConfig.mockResolvedValueOnce({ ok: false, error: { cause: { isAxiosError: true, response: { status: 404 } } } });
        await store.load();
        expect(store.loaded).toBe(true);
        expect(store.loadError).toBe('');
        expect(store.config.baseUrl).toBe('');
        expect(store.userModels).toHaveLength(1);
    });

    it('updates the model list after each successful mutation and keeps the editor on failure', async () => {
        const store = new SettingsStore();
        await store.load();
        store.openModelEditor();
        store.setModelValue('name', 'Second model');
        store.setModelValue('modelId', 'second-v1');
        store.setModelValue('apiKey', 'override-key');
        service.createUserModel.mockResolvedValue({ ok: true, data: 'model-2' });
        await store.saveModel();
        expect(store.userModels.at(-1)).toMatchObject({ id: 'model-2', name: 'Second model', apiKey: 'override-key' });
        store.openModelEditor(store.userModels[1]);
        store.setModelValue('apiKey', '');
        service.updateUserModel.mockResolvedValueOnce({ ok: false, error: { message: 'Couldn’t save' } });
        await store.saveModel();
        expect(store.modelDraft?.apiKey).toBe('');
        expect(store.userModels[1].apiKey).toBe('override-key');
        service.updateUserModel.mockResolvedValueOnce({ ok: true });
        await store.saveModel();
        expect(service.updateUserModel).toHaveBeenLastCalledWith({ id: 'model-2', name: 'Second model', modelId: 'second-v1', baseUrl: null, apiKey: null });
        expect(store.modelDraft).toBeNull();
        service.deleteUserModel.mockResolvedValue({ ok: true });
        await store.deleteModel('model-2');
        expect(store.userModels.map(item => item.id)).toEqual(['model-1']);
    });
});
