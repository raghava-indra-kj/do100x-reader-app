import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpenText, Cable, ChevronRight, CircleUserRound, Cpu } from 'lucide-react';
import { settingsSectionRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { SettingsIcon } from '@modules/core/branding';
import { AppBar } from '@modules/core/ui/components/appbar';
import { AccountPanel } from './account-panel';
import { AiPanel } from './ai-panel';
import { GuidePanel, McpPanel } from './reference-panels';
import { SettingsStore } from './store';
import './settings.css';

const sections = [
    { id: 'account', label: 'Account', heading: 'Account & preferences', icon: CircleUserRound },
    { id: 'ai', label: 'AI models', heading: 'AI models', icon: Cpu },
    { id: 'mcp', label: 'MCP server', heading: 'MCP server', icon: Cable },
    { id: 'guide', label: 'Format guide', heading: 'Format guide', icon: BookOpenText },
] as const;

function SettingsWorkspace() {
    const [params] = useSearchParams();
    const active = sections.find(section => section.id === params.get('section')) ?? sections[0];
    const [store] = useState(() => new SettingsStore());

    return <div className="settings-page">
        <AppBar />
        <div className="settings-workspace">
            <aside className="settings-sidebar">
                <div className="settings-sidebar-title"><SettingsIcon size={29} /><span>Settings</span></div>
                <nav aria-label="Settings sections" className="settings-nav">
                    {sections.map(({ id, label, icon: Icon }) => (
                        <Link key={id} to={settingsSectionRoute(id, params)}
                            aria-label={label}
                            aria-current={id === active.id ? 'page' : undefined}
                            className="settings-nav-link">
                            <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
                            {id === 'guide' ? <span><span className="settings-nav-qualifier">Format </span>guide</span> : <span>{label}</span>}
                            {id === active.id && <ChevronRight className="settings-nav-chevron" aria-hidden="true" size={15} />}
                        </Link>
                    ))}
                </nav>
            </aside>
            <main key={active.id} className="settings-main" aria-labelledby="settings-heading">
                <div className="settings-content">
                    <h1 id="settings-heading">{active.heading}</h1>
                    {active.id === 'account' && <AccountPanel />}
                    {active.id === 'ai' && <AiPanel store={store} />}
                    {active.id === 'mcp' && <McpPanel />}
                    {active.id === 'guide' && <GuidePanel />}
                </div>
            </main>
        </div>
    </div>;
}

export default observer(function SettingsPage() {
    const { currentUser } = useAuthStore();
    return <SettingsWorkspace key={currentUser.id} />;
});
