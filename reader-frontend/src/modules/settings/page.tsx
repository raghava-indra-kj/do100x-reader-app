import { useEffect, useMemo, useState } from 'react';
import { Observer } from 'mobx-react-lite';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBar, LogoutButton } from '@modules/core/ui/components/appbar';
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
  Sparkles,
} from 'lucide-react';
import { getLifePerspectiveConfig, saveLifePerspectiveConfig } from '@modules/core/utils/time-perspective';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';
import { useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';
import './settings.css';

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
    label: 'Account & preferences',
    subtitle: 'Your account and preferences',
    icon: User,
  },
  {
    id: 'ai',
    label: 'AI models',
    subtitle: 'Providers, models and API keys',
    icon: Bot,
  },
  {
    id: 'mcp',
    label: 'MCP server',
    subtitle: 'Connect an AI client',
    icon: Server,
  },
  {
    id: 'guide',
    label: 'Format guide',
    subtitle: 'Page formatting reference',
    icon: FileCode,
  },
];

export default function SettingsPage() {
  const authStore = useAuthStore();
  const motivationPreferences = useMotivationPreferences();
  const store = useMemo(() => new SettingsStore(), [authStore]);

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [motivationError, setMotivationError] = useState(false);

  // Credential Visibility & Copy States
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
    <div className="settings-page flex h-screen flex-col bg-[var(--color-surface-canvas)]">
      <AppBar />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-56 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]/40 p-3 shrink-0 flex flex-col gap-1 hidden md:flex overflow-y-auto">
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
        <main className="settings-main flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
          <div className="settings-content space-y-5">
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
                          <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">Account &amp; preferences</h2>
                            <LogoutButton showLabel />
                          </div>
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
                              <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Name</span>
                              <p className="text-sm font-medium text-[var(--color-text-strong)] mt-1.5 bg-[var(--color-surface-canvas)] px-3 py-2 rounded-xl border border-[var(--color-border-default)]">
                                {authStore.currentUser.label}
                              </p>
                            </div>

                            <div>
                              <span className="text-xs text-[var(--color-text-muted)] uppercase font-medium">Google account</span>
                              <p className="text-sm font-medium text-[var(--color-text-strong)] mt-1.5 break-all">{authStore.currentUser.email}</p>
                              <p className="text-xs text-[var(--color-text-muted)] mt-1">Signed in with Google.</p>
                            </div>
                          </div>
                        </section>

                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)]">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] shrink-0">
                                <Sparkles size={15} />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Quotes and breaks</h3>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                  Show quotes and break reminders on private pages. Never shown on public pages.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-label="Show quotes and breaks"
                              aria-checked={motivationPreferences.motivationsEnabled}
                              disabled={motivationPreferences.isLoading || motivationPreferences.isSaving}
                              onClick={async () => {
                                setMotivationError(false);
                                const saved = await motivationPreferences.setMotivationsEnabled(!motivationPreferences.motivationsEnabled);
                                if (!saved) setMotivationError(true);
                              }}
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] cursor-pointer disabled:cursor-wait disabled:opacity-50 ${motivationPreferences.motivationsEnabled ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-surface-soft)]'}`}
                            >
                              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${motivationPreferences.motivationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                          {motivationError && <p className="mt-3 text-xs text-red-500" role="alert">Couldn’t save this preference. Try again.</p>}
                        </section>

                        {/* Life Perspective Card */}
                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                <Hourglass size={15} />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Time perspective</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">Shows a time estimate on the break screen.</p>
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
                              <FormLabel>Date of birth</FormLabel>
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
                              <FormLabel>Estimated lifespan (years)</FormLabel>
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
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">AI models</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Choose the models used for explanations, meanings and questions.
                          </p>
                        </div>

                        {/* Global AI Configuration */}
                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-5">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                              <Bot size={15} />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Default connection</h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Provider URL</FormLabel>
                              <Input
                                value={store.baseUrlInput}
                                onValueChange={(v) => store.setBaseUrlInput(v)}
                                placeholder="https://api.openai.com/v1"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <FormLabel>API key</FormLabel>
                                {store.apiKeyInput && (
                                  <div className="flex items-center gap-1">
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
                                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                                >
                                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-3">
                            <h4 className="text-xs font-semibold text-[var(--color-text-muted)]">Models by feature</h4>
                            <div className="settings-feature-grid">
                            <div className="settings-feature" role="group" aria-label="Explanations">
                              <h4 className="text-sm font-semibold text-[var(--color-text-strong)]">Explanations</h4>
                              <div className="space-y-2">
                                <FormLabel>Model</FormLabel>
                                <Select value={store.explanationModelIdInput}
                                  onValueChange={(v) => store.setExplanationModelIdInput(v || '')}
                                  items={{ '': 'None', ...Object.fromEntries(store.userModels.map((m: any) => [m.modelId, m.name])) }}
                                  placeholder="Select model" tooltip="Explanations model" className="w-full min-w-0"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel htmlFor="settings-explanation-instructions">Custom instructions (optional)</FormLabel>
                                <textarea id="settings-explanation-instructions" aria-label="Explanation instructions"
                                  value={store.explanationSystemPromptInput}
                                  onChange={(e) => store.setExplanationSystemPromptInput(e.target.value)}
                                  placeholder="How should passages be explained?"
                                  className="settings-instructions"
                                />
                              </div>
                            </div>
                            <div className="settings-feature" role="group" aria-label="Word meanings">
                              <h4 className="text-sm font-semibold text-[var(--color-text-strong)]">Word meanings</h4>
                              <div className="space-y-2">
                                <FormLabel>Model</FormLabel>
                                <Select value={store.meaningModelIdInput}
                                  onValueChange={(v) => store.setMeaningModelIdInput(v || '')}
                                  items={{ '': 'None', ...Object.fromEntries(store.userModels.map((m: any) => [m.modelId, m.name])) }}
                                  placeholder="Select model" tooltip="Word meanings model" className="w-full min-w-0"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel htmlFor="settings-meaning-instructions">Custom instructions (optional)</FormLabel>
                                <textarea id="settings-meaning-instructions" aria-label="Word-meaning instructions"
                                  value={store.meaningSystemPromptInput}
                                  onChange={(e) => store.setMeaningSystemPromptInput(e.target.value)}
                                  placeholder="How should words be explained?"
                                  className="settings-instructions"
                                />
                              </div>
                            </div>
                            <div className="settings-feature" role="group" aria-label="Questions">
                              <h4 className="text-sm font-semibold text-[var(--color-text-strong)]">Questions</h4>
                              <div className="space-y-2">
                                <FormLabel>Model</FormLabel>
                                <Select value={store.doubtModelIdInput}
                                  onValueChange={(v) => store.setDoubtModelIdInput(v || '')}
                                  items={{ '': 'None', ...Object.fromEntries(store.userModels.map((m: any) => [m.modelId, m.name])) }}
                                  placeholder="Select model" tooltip="Questions model" className="w-full min-w-0"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel htmlFor="settings-doubt-instructions">Custom instructions (optional)</FormLabel>
                                <textarea id="settings-doubt-instructions" aria-label="Question instructions"
                                  value={store.doubtSystemPromptInput}
                                  onChange={(e) => store.setDoubtSystemPromptInput(e.target.value)}
                                  placeholder="How should questions be answered?"
                                  className="settings-instructions"
                                />
                              </div>
                            </div>
                            </div>
                          </div>

                          <div className="settings-save-footer">
                            <Button size="sm" onClick={() => store.saveConfig()} loading={store.isSavingConfig}>
                              Save
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
                                <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Custom models</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  Add a model. Set its connection details only if they differ from the defaults.
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
                                <p className="text-xs text-[var(--color-text-muted)]">No models added.</p>
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
                                            Edit model
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
                                            <FormLabel>Display name</FormLabel>
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
                                            <FormLabel>Provider URL (optional)</FormLabel>
                                            <Input
                                              value={store.editModelBaseUrlInput}
                                              onValueChange={(v) => store.setEditModelBaseUrlInput(v)}
                                              placeholder="Leave blank to use the default provider URL"
                                            />
                                          </div>
                                          <div className="space-y-1.5">
                                            <FormLabel>API key (optional)</FormLabel>
                                            <div className="relative flex items-center">
                                              <Input
                                                type={showEditModelApiKey ? 'text' : 'password'}
                                                value={store.editModelApiKeyInput}
                                                onValueChange={(v) => store.setEditModelApiKeyInput(v)}
                                                placeholder="Leave blank to use the default API key"
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
                                            Save
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
                                                Custom API key
                                              </span>
                                            ) : null}

                                            {!m.baseUrl && !m.apiKey ? (
                                              <span className="text-[var(--color-text-subtle)] text-[11px]">
                                                Uses the default connection
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
                                Add model
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormLabel>Display name</FormLabel>
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
                                <FormLabel>Provider URL (optional)</FormLabel>
                                <Input
                                  value={store.newModelBaseUrlInput}
                                  onValueChange={(v) => store.setNewModelBaseUrlInput(v)}
                                  placeholder="e.g. https://api.groq.com/openai/v1"
                                />
                              </div>
                              <div className="space-y-2">
                                <FormLabel>API key (optional)</FormLabel>
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
                              <span>Add model</span>
                            </Button>
                          </div>
                        </section>
                      </div>
                    )}

                    {/* TAB 3: MCP SERVER */}
                    {activeTab === 'mcp' && (
                      <div className="space-y-6 animate-fade-in">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">MCP server</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Use this connection for Reader, Tasks and Finance.
                          </p>
                        </div>

                        <section className="p-6 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]">
                                <Server size={15} />
                              </div>
                              <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">
                                Connection
                              </h3>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              SSE connection
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
                                <span>{copiedMcpJson ? 'Copied' : 'Copy configuration'}</span>
                              </Button>
                            </div>
                          </div>

                          {/* Config Snippet */}
                          <div className="rounded-2xl bg-[var(--color-surface-canvas)] p-4 border border-[var(--color-border-subtle)] space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-[var(--color-text-strong)]">
                                Configuration
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
                          <h2 className="text-xl font-semibold text-[var(--color-text-strong)]">Format guide</h2>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Formatting reference for pages created by an AI client.
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
                              <span>{copiedGuide ? 'Copied' : 'Copy guide'}</span>
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
