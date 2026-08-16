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
  Plus,
} from 'lucide-react';
import { getLifePerspectiveConfig, saveLifePerspectiveConfig } from '@modules/core/utils/time-perspective';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';

type SettingsTab = 'account' | 'ai' | 'mcp' | 'guide';

interface TabItem {
  id: SettingsTab;
  label: string;
  subtitle: string;
  icon: typeof User;
}

const TABS: TabItem[] = [
  {
    id: 'account',
    label: 'Account & Preferences',
    subtitle: 'Profile & lifespan settings',
    icon: User,
  },
  {
    id: 'ai',
    label: 'AI Models',
    subtitle: 'Providers & model keys',
    icon: Bot,
  },
  {
    id: 'mcp',
    label: 'MCP Server',
    subtitle: 'Agent connections & config',
    icon: Server,
  },
  {
    id: 'guide',
    label: 'Format Guide',
    subtitle: 'format.llm.md specification',
    icon: FileCode,
  },
];

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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-64 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]/40 p-4 shrink-0 flex flex-col gap-1 hidden md:flex overflow-y-auto">
          <div className="px-3 py-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-strong)] font-[family-name:var(--font-serif)]">
              Settings
            </h1>
          </div>

          <div className="h-px bg-[var(--color-border-subtle)] my-2" />

          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-brand-soft)]/60 text-[var(--color-text-strong)] font-medium border border-[var(--color-brand)]/20 shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-[var(--color-brand)] text-[var(--color-surface-canvas)]'
                        : 'bg-[var(--color-surface-soft)] text-[var(--color-text-subtle)]'
                    }`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs ${isActive ? 'font-semibold text-[var(--color-text-strong)]' : 'font-medium'}`}>
                      {tab.label}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{tab.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex overflow-x-auto border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]/50 p-2 gap-1 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-brand)] text-[var(--color-surface-canvas)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] bg-[var(--color-surface-soft)]'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <Observer>
              {() =>
                store.isLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader size={36} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* TAB 1: ACCOUNT & PREFERENCES */}
                    {activeTab === 'account' && (
                      <div className="space-y-6 animate-fade-in">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">Account & Preferences</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Your credentials and personal settings
                          </p>
                        </div>

                        {/* Profile Card */}
                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <User size={15} />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Profile</h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                              <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Username</span>
                              <p className="text-sm font-medium text-[var(--color-text-strong)] mt-1.5 bg-[var(--color-surface-canvas)] px-3 py-2 rounded-xl border border-[var(--color-border-default)]">
                                {authStore.currentUser.username}
                              </p>
                            </div>

                            <div>
                              <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Password</span>
                              <div className="flex items-center gap-2 mt-1.5">
                                <p className="text-sm font-mono text-[var(--color-text-strong)] bg-[var(--color-surface-canvas)] px-3 py-2 rounded-xl border border-[var(--color-border-default)] select-all flex-1 min-w-[140px]">
                                  {showPassword ? authStore.currentUser.password || '(no password set)' : '••••••••••••'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-default)] transition-colors cursor-pointer"
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
                                    className={`p-2 rounded-xl border border-[var(--color-border-default)] transition-colors cursor-pointer ${
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
                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                <Hourglass size={15} />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Life Perspective</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">Remaining time counter on the Inspirations screen</p>
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

                    {/* TAB 2: AI MODELS */}
                    {activeTab === 'ai' && (
                      <div className="space-y-6 animate-fade-in">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">AI Models</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Configure provider credentials and custom models
                          </p>
                        </div>

                        {/* Global AI Configuration */}
                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-5">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <Bot size={15} />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Default Credentials</h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Provider Base URL</FormLabel>
                              <Input
                                value={store.baseUrlInput}
                                onValueChange={(v) => store.setBaseUrlInput(v)}
                                placeholder="https://api.openai.com/v1"
                              />
                            </div>

                            <div className="space-y-2">
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
                            <h4 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-3">
                              Model Assignments
                            </h4>
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
                            <h4 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                              System Prompts (Optional)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <FormLabel>Explanation Prompt</FormLabel>
                                <textarea
                                  value={store.explanationSystemPromptInput}
                                  onChange={(e) => store.setExplanationSystemPromptInput(e.target.value)}
                                  placeholder="Custom instructions for passage explanation..."
                                  className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-xl transition-colors outline-none h-20"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel>Meanings Prompt</FormLabel>
                                <textarea
                                  value={store.meaningSystemPromptInput}
                                  onChange={(e) => store.setMeaningSystemPromptInput(e.target.value)}
                                  placeholder="Custom instructions for word meanings..."
                                  className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-xl transition-colors outline-none h-20"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel>Doubts Prompt</FormLabel>
                                <textarea
                                  value={store.doubtSystemPromptInput}
                                  onChange={(e) => store.setDoubtSystemPromptInput(e.target.value)}
                                  placeholder="Custom instructions for answering reading doubts..."
                                  className="w-full resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-3 py-2 text-xs rounded-xl transition-colors outline-none h-20"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button onClick={() => store.saveConfig()} loading={store.isSavingConfig}>
                              Save Settings
                            </Button>
                          </div>
                        </section>

                        {/* Custom Models Management */}
                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                <Layers size={15} />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Custom Models</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  Add models with custom endpoints or API keys
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                              {store.userModels.length} Model{store.userModels.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {/* Models List */}
                          <div className="space-y-3">
                            {store.userModels.length === 0 ? (
                              <div className="text-center py-6 border border-dashed border-[var(--color-border-subtle)] rounded-xl bg-[var(--color-surface-canvas)]">
                                <Bot size={24} className="mx-auto text-[var(--color-text-subtle)] mb-1.5" />
                                <p className="text-xs text-[var(--color-text-muted)]">No custom models added yet.</p>
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
                                            Edit Model
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
                                            <FormLabel>Display Name</FormLabel>
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
                                            <FormLabel>Base URL (Optional)</FormLabel>
                                            <Input
                                              value={store.editModelBaseUrlInput}
                                              onValueChange={(v) => store.setEditModelBaseUrlInput(v)}
                                              placeholder="Inherits default Base URL if empty"
                                            />
                                          </div>
                                          <div className="space-y-1.5">
                                            <FormLabel>API Key (Optional)</FormLabel>
                                            <div className="relative flex items-center">
                                              <Input
                                                type={showEditModelApiKey ? 'text' : 'password'}
                                                value={store.editModelApiKeyInput}
                                                onValueChange={(v) => store.setEditModelApiKeyInput(v)}
                                                placeholder="Inherits default API Key if empty"
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
                                                Custom Key
                                              </span>
                                            ) : null}

                                            {!m.baseUrl && !m.apiKey ? (
                                              <span className="text-[var(--color-text-subtle)] text-[11px]">
                                                Uses default credentials
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
                                            tooltip="Edit model"
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
                              <h4 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                                Add Model
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormLabel>Display Name</FormLabel>
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
                                <FormLabel>Base URL (Optional)</FormLabel>
                                <Input
                                  value={store.newModelBaseUrlInput}
                                  onValueChange={(v) => store.setNewModelBaseUrlInput(v)}
                                  placeholder="e.g. https://api.groq.com/openai/v1"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel>API Key (Optional)</FormLabel>
                                <div className="relative flex items-center">
                                  <Input
                                    type={showNewModelApiKey ? 'text' : 'password'}
                                    value={store.newModelApiKeyInput}
                                    onValueChange={(v) => store.setNewModelApiKeyInput(v)}
                                    placeholder="Custom API key"
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

                    {/* TAB 3: MCP SERVER */}
                    {activeTab === 'mcp' && (
                      <div className="space-y-6 animate-fade-in">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">MCP Server</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Connect external AI agents directly to your Reader app
                          </p>
                        </div>

                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                <Server size={15} />
                              </div>
                              <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">
                                Connection Details
                              </h3>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live SSE
                            </span>
                          </div>

                          {/* Secret URL Card */}
                          <div className="space-y-2 pt-1">
                            <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">
                              Server URL
                            </span>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-mono text-[var(--color-text-strong)] bg-[var(--color-surface-canvas)] px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] select-all flex-1 truncate">
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
                                <span>{copiedMcpUrl ? 'Copied' : 'Copy URL'}</span>
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
                                <span>{copiedMcpJson ? 'Copied Config' : 'Copy JSON Config'}</span>
                              </Button>
                            </div>
                          </div>

                          {/* Config Snippet */}
                          <div className="rounded-2xl bg-[var(--color-surface-canvas)] p-4 border border-[var(--color-border-subtle)] space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-[var(--color-text-strong)]">
                                Configuration Snippet
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
                                <Copy size={12} /> Copy
                              </button>
                            </div>
                            <pre className="font-mono text-xs text-[var(--color-text-body)] overflow-x-auto p-3.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] leading-relaxed">
                              {mcpConfigJson}
                            </pre>
                          </div>
                        </section>
                      </div>
                    )}

                    {/* TAB 4: FORMAT GUIDE */}
                    {activeTab === 'guide' && (
                      <div className="space-y-6 animate-fade-in">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">Format Guide</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Markdown format rules for AI-generated pages
                          </p>
                        </div>

                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                <FileCode size={15} />
                              </div>
                              <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">
                                format.llm.md
                              </h3>
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
                              <span>{copiedGuide ? 'Copied' : 'Copy Guide'}</span>
                            </Button>
                          </div>
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
        </main>
      </div>
    </div>
  );
}
