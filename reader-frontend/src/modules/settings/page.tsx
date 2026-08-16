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
import {
  User,
  Bot,
  Server,
  FileCode,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Hourglass,
  Pencil,
  Globe,
  Key,
  X,
  Layers,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { getLifePerspectiveConfig, saveLifePerspectiveConfig } from '@modules/core/utils/time-perspective';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';

type SettingsTab = 'account' | 'ai' | 'mcp' | 'guide';

export default function SettingsPage() {
  const authStore = useAuthStore();
  const store = useMemo(() => new SettingsStore({ userId: authStore.currentUser.id }), [authStore]);

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Credential Visibility & Copy States
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
  const [copiedMcpJson, setCopiedMcpJson] = useState(false);
  const [showNewModelApiKey, setShowNewModelApiKey] = useState(false);
  const [showEditModelApiKey, setShowEditModelApiKey] = useState(false);

  // Life Perspective State
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

  const mcpUrl = `${window.location.origin}/sse/${authStore.currentUser.id}`;
  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        reader: {
          serverUrl: mcpUrl,
        },
      },
    },
    null,
    2
  );

  return (
    <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
      <AppBar />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-5">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-strong)] font-[family-name:var(--font-serif)]">
                Settings
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Manage your account credentials, AI models, MCP integrations, and guides
              </p>
            </div>

            {/* Quick Tab Selector */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-soft)] p-1 rounded-xl border border-[var(--color-border-subtle)] self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <User size={14} />
                <span>Account</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Bot size={14} />
                <span>AI & Models</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mcp')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'mcp'
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Server size={14} />
                <span>MCP Server</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-[var(--color-surface-card)] text-[var(--color-text-strong)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <FileCode size={14} />
                <span>Format Guide</span>
              </button>
            </div>
          </div>

          {/* Loader */}
          <Observer>
            {() =>
              store.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader size={36} />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* TAB 1: ACCOUNT & PERSPECTIVE */}
                  {activeTab === 'account' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Profile Card */}
                      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Profile & Security</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">Your local workspace credentials</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Logged in User</span>
                            <p className="text-sm font-medium text-[var(--color-text-strong)] mt-1.5 bg-[var(--color-surface-canvas)] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
                              {authStore.currentUser.username}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Password</span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="text-sm font-mono text-[var(--color-text-strong)] bg-[var(--color-surface-canvas)] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] select-all flex-1 min-w-[140px]">
                                {showPassword ? authStore.currentUser.password || '(no password set)' : '••••••••••••'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-default)] transition-colors cursor-pointer"
                                title={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              {authStore.currentUser.password && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(authStore.currentUser.password);
                                    setCopiedPassword(true);
                                    setTimeout(() => setCopiedPassword(false), 1500);
                                  }}
                                  className={`p-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] transition-colors cursor-pointer ${
                                    copiedPassword
                                      ? 'text-[var(--color-brand)] bg-[var(--color-surface-hover)]'
                                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)]'
                                  }`}
                                  title={copiedPassword ? 'Copied!' : 'Copy password'}
                                >
                                  {copiedPassword ? <Check size={15} /> : <Copy size={15} />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Life Perspective Card */}
                      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <Hourglass size={15} />
                            </div>
                            <div>
                              <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Life Perspective & Memento Mori</h2>
                              <p className="text-xs text-[var(--color-text-muted)]">Real-time remaining life awareness widget on the Inspirations screen</p>
                            </div>
                          </div>
                          {lifeSaved && (
                            <span className="flex items-center gap-1 text-xs text-[var(--color-brand)] font-medium animate-fade-in">
                              <Check size={14} /> Saved
                            </span>
                          )}
                        </div>

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
                    </div>
                  )}

                  {/* TAB 2: AI & MODELS */}
                  {activeTab === 'ai' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Global AI Configuration */}
                      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                            <Bot size={15} />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Global AI Configuration</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">Default OpenAI-compatible endpoint used for explanation and meaning generation</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel>Default Provider Base URL</FormLabel>
                            <Input
                              value={store.baseUrlInput}
                              onValueChange={(v) => store.setBaseUrlInput(v)}
                              placeholder="https://api.openai.com/v1"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel>Default API Key</FormLabel>
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
                                type={showApiKey ? 'text' : 'password'}
                                value={store.apiKeyInput}
                                onValueChange={(v) => store.setApiKeyInput(v)}
                                placeholder="Enter provider API key"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey((prev) => !prev)}
                                className="absolute right-2.5 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                                title={showApiKey ? 'Hide API key' : 'Show API key'}
                              >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Task-Specific Model Assignments */}
                        <div className="border-t border-[var(--color-border-subtle)] pt-4">
                          <h3 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-3">
                            Task Model Assignments
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Passage Explanation</FormLabel>
                              <Select
                                value={store.explanationModelIdInput}
                                onValueChange={(v) => store.setExplanationModelIdInput(v || '')}
                                items={{
                                  '': 'None',
                                  ...Object.fromEntries(store.userModels.map((m: any) => [m.modelId, m.name])),
                                }}
                                placeholder="Select model"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Word Meanings</FormLabel>
                              <Select
                                value={store.meaningModelIdInput}
                                onValueChange={(v) => store.setMeaningModelIdInput(v || '')}
                                items={{
                                  '': 'None',
                                  ...Object.fromEntries(store.userModels.map((m: any) => [m.modelId, m.name])),
                                }}
                                placeholder="Select model"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Asking Doubts</FormLabel>
                              <Select
                                value={store.doubtModelIdInput}
                                onValueChange={(v) => store.setDoubtModelIdInput(v || '')}
                                items={{
                                  '': 'None',
                                  ...Object.fromEntries(store.userModels.map((m: any) => [m.modelId, m.name])),
                                }}
                                placeholder="Select model"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Global Custom System Prompts */}
                        <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-4">
                          <h3 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                            Global System Prompts (Optional)
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Explanation Prompt</FormLabel>
                              <textarea
                                value={store.explanationSystemPromptInput}
                                onChange={(e) => store.setExplanationSystemPromptInput(e.target.value)}
                                placeholder="Instructions for passage explanation..."
                                className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-20"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Meanings Prompt</FormLabel>
                              <textarea
                                value={store.meaningSystemPromptInput}
                                onChange={(e) => store.setMeaningSystemPromptInput(e.target.value)}
                                placeholder="Instructions for vocabulary definitions..."
                                className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-20"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Doubts Prompt</FormLabel>
                              <textarea
                                value={store.doubtSystemPromptInput}
                                onChange={(e) => store.setDoubtSystemPromptInput(e.target.value)}
                                placeholder="Instructions for answering reading doubts..."
                                className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-[var(--radius-md)] transition-colors outline-none h-20"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button onClick={() => store.saveConfig()} loading={store.isSavingConfig}>
                            Save AI Configuration
                          </Button>
                        </div>
                      </section>

                      {/* Custom Models Management */}
                      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <Layers size={15} />
                            </div>
                            <div>
                              <h2 className="text-base font-semibold text-[var(--color-text-strong)]">Custom AI Models</h2>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                Configure dedicated models with custom endpoints (e.g. Groq, Ollama, DeepSeek, OpenRouter)
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                            {store.userModels.length} Model{store.userModels.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Models List */}
                        <div className="space-y-3">
                          {store.userModels.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-[var(--color-border-subtle)] rounded-xl bg-[var(--color-surface-canvas)]">
                              <Bot size={24} className="mx-auto text-[var(--color-text-subtle)] mb-1.5" />
                              <p className="text-xs text-[var(--color-text-muted)]">No custom models registered yet.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {store.userModels.map((m: any) => (
                                <div
                                  key={m.id}
                                  className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] transition-all"
                                >
                                  {store.editingModelId === m.id ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[var(--color-text-strong)] flex items-center gap-1.5">
                                          <Pencil size={13} className="text-[var(--color-brand)]" />
                                          Edit Model Credentials
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => store.cancelEditingModel()}
                                          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] cursor-pointer"
                                        >
                                          <X size={15} />
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                          <FormLabel>Model Display Name</FormLabel>
                                          <Input
                                            value={store.editModelNameInput}
                                            onValueChange={(v) => store.setEditModelNameInput(v)}
                                            placeholder="GPT-4o"
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <FormLabel>Model ID</FormLabel>
                                          <Input
                                            value={store.editModelIdInput}
                                            onValueChange={(v) => store.setEditModelIdInput(v)}
                                            placeholder="gpt-4o"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1.5">
                                          <FormLabel>Custom Base URL (Optional)</FormLabel>
                                          <Input
                                            value={store.editModelBaseUrlInput}
                                            onValueChange={(v) => store.setEditModelBaseUrlInput(v)}
                                            placeholder="Inherits global Base URL if empty"
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <FormLabel>Custom API Key (Optional)</FormLabel>
                                          <div className="relative flex items-center">
                                            <Input
                                              type={showEditModelApiKey ? 'text' : 'password'}
                                              value={store.editModelApiKeyInput}
                                              onValueChange={(v) => store.setEditModelApiKeyInput(v)}
                                              placeholder="Inherits global API Key if empty"
                                              className="pr-9"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setShowEditModelApiKey((prev) => !prev)}
                                              className="absolute right-2.5 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                                              title={showEditModelApiKey ? 'Hide API key' : 'Show API key'}
                                            >
                                              {showEditModelApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 pt-1">
                                        <Button
                                          size="sm"
                                          onClick={() => store.updateModel()}
                                          loading={store.isUpdatingModel}
                                        >
                                          Save Changes
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => store.cancelEditingModel()}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-sm font-semibold text-[var(--color-text-strong)]">{m.name}</p>
                                          <span className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded border border-[var(--color-border-subtle)]">
                                            {m.modelId}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                          {m.baseUrl ? (
                                            <span className="inline-flex items-center gap-1 text-[var(--color-brand)] bg-[var(--color-brand-soft)]/40 px-2 py-0.5 rounded border border-[var(--color-brand)]/20 font-mono">
                                              <Globe size={11} className="shrink-0" />
                                              <span className="truncate max-w-[260px]">{m.baseUrl}</span>
                                            </span>
                                          ) : null}

                                          {m.apiKey ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                                              <Key size={11} className="shrink-0" />
                                              Custom API Key
                                            </span>
                                          ) : null}

                                          {!m.baseUrl && !m.apiKey ? (
                                            <span className="text-[var(--color-text-subtle)] text-[11px]">
                                              Inherits global Base URL & API Key
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          iconOnly
                                          onClick={() => store.startEditingModel(m)}
                                          tooltip="Edit model credentials"
                                        >
                                          <Pencil size={15} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          iconOnly
                                          onClick={() => store.deleteModel(m.id)}
                                          loading={store.deletingModelIds.has(m.id)}
                                          tooltip="Delete model"
                                        >
                                          <Trash2 size={15} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-error)]" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Model Form */}
                        <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <Plus size={14} className="text-[var(--color-brand)]" />
                            <h3 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                              Register New Model
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Model Display Name</FormLabel>
                              <Input
                                value={store.newModelNameInput}
                                onValueChange={(v) => store.setNewModelNameInput(v)}
                                placeholder="e.g. Groq LLaMA 3.3 70B"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Model ID</FormLabel>
                              <Input
                                value={store.newModelIdInput}
                                onValueChange={(v) => store.setNewModelIdInput(v)}
                                placeholder="e.g. llama-3.3-70b-versatile"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Custom Base URL (Optional)</FormLabel>
                              <Input
                                value={store.newModelBaseUrlInput}
                                onValueChange={(v) => store.setNewModelBaseUrlInput(v)}
                                placeholder="e.g. https://api.groq.com/openai/v1"
                              />
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Custom API Key (Optional)</FormLabel>
                              <div className="relative flex items-center">
                                <Input
                                  type={showNewModelApiKey ? 'text' : 'password'}
                                  value={store.newModelApiKeyInput}
                                  onValueChange={(v) => store.setNewModelApiKeyInput(v)}
                                  placeholder="Custom API key for this model"
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewModelApiKey((prev) => !prev)}
                                  className="absolute right-2.5 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
                                  title={showNewModelApiKey ? 'Hide API key' : 'Show API key'}
                                >
                                  {showNewModelApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outlined"
                            onClick={() => store.addModel()}
                            loading={store.isAddingModel}
                            className="flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            <span>Add Model</span>
                          </Button>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* TAB 3: MCP INTEGRATION */}
                  {activeTab === 'mcp' && (
                    <div className="space-y-6 animate-fade-in">
                      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <Server size={15} />
                            </div>
                            <div>
                              <h2 className="text-base font-semibold text-[var(--color-text-strong)]">
                                Model Context Protocol (MCP) Server
                              </h2>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                Connect external AI agents (Antigravity IDE, Claude Desktop, Cursor) directly to your Reader workspace
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live SSE Transport
                          </span>
                        </div>

                        {/* Secret URL Card */}
                        <div className="space-y-2 pt-1">
                          <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">
                            Your Unique MCP Server URL
                          </span>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-[var(--color-text-strong)] bg-[var(--color-surface-canvas)] px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] select-all flex-1 truncate">
                              {mcpUrl}
                            </p>
                            <Button
                              variant="outlined"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(mcpUrl);
                                setCopiedMcpUrl(true);
                                setTimeout(() => setCopiedMcpUrl(false), 1500);
                              }}
                              className="flex items-center gap-1.5 shrink-0 text-xs"
                            >
                              {copiedMcpUrl ? <Check size={14} className="text-[var(--color-brand)]" /> : <Copy size={14} />}
                              <span>{copiedMcpUrl ? 'Copied URL!' : 'Copy URL'}</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(mcpConfigJson);
                                setCopiedMcpJson(true);
                                setTimeout(() => setCopiedMcpJson(false), 1500);
                              }}
                              className="flex items-center gap-1.5 shrink-0 text-xs"
                            >
                              {copiedMcpJson ? <Check size={14} /> : <Copy size={14} />}
                              <span>{copiedMcpJson ? 'Copied JSON Config!' : 'Copy JSON Config'}</span>
                            </Button>
                          </div>
                        </div>

                        {/* Config Snippet */}
                        <div className="rounded-xl bg-[var(--color-surface-canvas)] p-4 border border-[var(--color-border-subtle)] space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-[var(--color-text-strong)]">
                              JSON Config Snippet (for <code>.agents/mcp_config.json</code>, Claude Desktop, or Cursor):
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(mcpConfigJson);
                                setCopiedMcpJson(true);
                                setTimeout(() => setCopiedMcpJson(false), 1500);
                              }}
                              className="text-xs text-[var(--color-brand)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Copy size={12} /> Copy Snippet
                            </button>
                          </div>
                          <pre className="font-mono text-xs text-[var(--color-text-body)] overflow-x-auto p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] leading-relaxed">
                            {mcpConfigJson}
                          </pre>
                        </div>

                        {/* Capabilities Overview */}
                        <div className="border-t border-[var(--color-border-subtle)] pt-4">
                          <h3 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-3">
                            Supported MCP Capabilities
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)] space-y-1">
                              <p className="text-xs font-semibold text-[var(--color-text-strong)]">Precision Updates</p>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                <code>reader_update_section</code> (by index) & <code>reader_replace_lines</code>
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)] space-y-1">
                              <p className="text-xs font-semibold text-[var(--color-text-strong)]">Full Workspace CRUD</p>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                Manage pages, subpages, comments, vocabulary, and hierarchical tree
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)] space-y-1">
                              <p className="text-xs font-semibold text-[var(--color-text-strong)]">Strict User Isolation</p>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                Requests are strictly bound to your authenticated user token
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* TAB 4: FORMAT GUIDE */}
                  {activeTab === 'guide' && (
                    <div className="space-y-6 animate-fade-in">
                      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <FileCode size={15} />
                            </div>
                            <div>
                              <h2 className="text-base font-semibold text-[var(--color-text-strong)]">
                                Markdown LLM Guide (format.llm.md)
                              </h2>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                Prompt instructions & frontmatter schema for AI-generated pages
                              </p>
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
                            <span>{copiedGuide ? 'Copied Guide!' : 'Copy format.llm.md'}</span>
                          </Button>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                          Provide this schema to external LLMs (ChatGPT, Claude, Gemini) when asking them to write documentation pages for Reader. It ensures required frontmatter titles, sections, Callouts, Details, Mermaid, and D2 diagrams are generated correctly.
                        </p>
                        <div className="relative">
                          <pre className="p-4 rounded-xl bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] text-xs font-mono text-[var(--color-text-body)] max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                            {FORMAT_LLM_MD_CONTENT}
                          </pre>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )
            }
          </Observer>
        </div>
      </div>
    </div>
  );
}
