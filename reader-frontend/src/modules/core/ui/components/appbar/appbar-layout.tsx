import type { ReactNode } from 'react';
import { suiteApps } from '@modules/core/apps/app-catalog';
import { AppsSwitcher } from '@modules/core/apps/apps-switcher';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { AppBarLogo } from './appbar-logo';
import { AccountAvatar } from './account-avatar';
import '@modules/core/apps/suite.css';

type AppId = typeof suiteApps[number]['id'];

/** Shared chrome only; each application owns its breadcrumbs and tools. */
export function AppBarLayout({ app, breadcrumbs, actions, tools, showApps = true }: {
    app?: AppId;
    breadcrumbs?: ReactNode;
    actions?: ReactNode;
    tools?: ReactNode;
    showApps?: boolean;
}) {
    const name = suiteApps.find(item => item.id === app)?.name;
    return <div className="suite-appbar-shell">
        <header className="suite-appbar">
            <div className="suite-appbar-identity">
                <AppBarLogo compact />
                {name && <span className="suite-appbar-name">{name}</span>}
                {breadcrumbs && <div className="suite-appbar-breadcrumbs">{breadcrumbs}</div>}
            </div>
            <div className="suite-appbar-actions">
                {tools}
                {actions}
                {showApps && <AppsSwitcher compact />}
                <ThemeSelector className="suite-appbar-theme h-8 py-0 text-xs" />
                <AccountAvatar />
            </div>
        </header>
    </div>;
}
