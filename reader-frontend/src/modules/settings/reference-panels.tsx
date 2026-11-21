import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@modules/auth/provider/store';
import { FORMAT_LLM_MD_CONTENT } from '@modules/core/constants/format-llm-guide';
import { SettingsCopyButton } from './settings-copy-button';
import './reference-panels.css';

const GuideTopics = lazy(() => import('./guide-topics'));

class GuidePreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (this.state.failed) {
      return <div className="settings-guide-source">
        <p className="settings-description" role="status">The formatted preview is unavailable. Showing the original Markdown.</p>
        <pre className="settings-reference-code" aria-label="Original guide Markdown">{FORMAT_LLM_MD_CONTENT}</pre>
      </div>;
    }
    return this.props.children;
  }
}

function clientConfiguration(serverUrl: string) {
  return JSON.stringify({ mcpServers: { do100x: { serverUrl } } }, null, 2);
}

export function McpPanel() {
  const auth = useAuthStore();
  const [revealed, setRevealed] = useState(false);
  const base = `${window.location.origin}/sse/`;
  const url = base + encodeURIComponent(auth.currentUser.id);
  const displayUrl = revealed ? url : base + '••••••••';

  return <div className="settings-panel">
    <section className="settings-card settings-reference-card" aria-labelledby="settings-endpoint-title">
      <div className="settings-reference-heading">
        <h2 className="settings-card-heading" id="settings-endpoint-title">Server URL</h2>
        <SettingsCopyButton label="Copy URL" text={url} className="settings-action--primary"
          fallbackHint="Clipboard unavailable. Reveal the private URL, then select it to copy." />
      </div>
      <p className="settings-description">Add a remote server in your MCP client and choose the SSE transport.</p>
      <div className="settings-server-url">
        <code id="settings-server-url" className={revealed ? 'settings-reference-selectable' : 'settings-reference-masked'}>{displayUrl}</code>
        <button type="button" className="settings-action settings-url-visibility" aria-label={revealed ? 'Hide private URL' : 'Show private URL'}
          onClick={() => setRevealed(value => !value)} aria-controls="settings-server-url settings-server-config">
          {revealed ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          {revealed ? 'Hide' : 'Show'}
        </button>
      </div>
    </section>
    <section className="settings-card settings-reference-card" aria-labelledby="settings-config-title">
      <div className="settings-reference-heading">
        <h2 className="settings-card-heading" id="settings-config-title">Client configuration</h2>
        <SettingsCopyButton label="Copy JSON" text={clientConfiguration(url)}
          fallbackHint="Clipboard unavailable. Reveal the private URL, then select the configuration to copy." />
      </div>
      <p className="settings-description">For clients that accept <code>mcpServers</code> and <code>serverUrl</code>, copy this configuration with your private URL included.</p>
      <pre className={`settings-reference-code ${revealed ? 'settings-reference-selectable' : 'settings-reference-masked'}`}
        id="settings-server-config"><code>{clientConfiguration(displayUrl)}</code></pre>
    </section>
  </div>;
}

export function GuidePanel() {
  return <div className="settings-panel">
    <section className="settings-card settings-reference-card" aria-labelledby="settings-guide-title">
      <div className="settings-reference-heading">
        <h2 className="settings-card-heading" id="settings-guide-title">Markdown reference</h2>
        <SettingsCopyButton label="Copy guide" text={FORMAT_LLM_MD_CONTENT} className="settings-action--primary" />
      </div>
      <p className="settings-description">Look up supported syntax or copy the full guide for your AI client.</p>
      <GuidePreviewBoundary>
        <Suspense fallback={<p className="settings-description" role="status">Loading guide…</p>}>
          <GuideTopics />
        </Suspense>
      </GuidePreviewBoundary>
    </section>
  </div>;
}
