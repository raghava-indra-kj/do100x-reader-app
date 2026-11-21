import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { suiteApps } from '@modules/core/apps/app-catalog';
import { useLocation } from 'react-router-dom';
import { AppBarLogo } from './appbar-logo';
import { AppBarOverflow } from './appbar-overflow';
import { AppBarSuiteActions } from './appbar-suite-actions';
import { useViewport } from './use-viewport';
import '@modules/core/apps/suite.css';

type AppId = typeof suiteApps[number]['id'];

export type CompactAppBarSlots = {
    leading: ReactNode;
    actions: ReactNode;
    menu: ReactNode;
    overflowTriggerRef?: Ref<HTMLButtonElement>;
};

function CompactControls({ leading, actions, menu, showApps, overflowTriggerRef }: CompactAppBarSlots & { showApps: boolean }) {
    const { pathname } = useLocation();
    return <>
        <div className="suite-appbar-identity">{leading}</div>
        <div className="suite-appbar-actions">
            {actions}
            <AppBarOverflow key={pathname} triggerRef={overflowTriggerRef}>
                {menu}
                <div className="suite-appbar-overflow-suite" role="group" aria-label="Workspace controls">
                    <AppBarSuiteActions showApps={showApps} inOverflow />
                </div>
            </AppBarOverflow>
        </div>
    </>;
}

/** Shared chrome only; each application owns its breadcrumbs and tools. */
export function AppBarLayout({ app, breadcrumbs, actions, tools, showApps = true, compact }: {
    app?: AppId;
    breadcrumbs?: ReactNode;
    actions?: ReactNode;
    tools?: ReactNode;
    showApps?: boolean;
    compact?: CompactAppBarSlots;
}) {
    const current = suiteApps.find(item => item.id === app);
    const narrow = useViewport(compact ? '(max-width: 640px)' : null);
    const shell = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        // Follow the same scrolling ancestor that positions the sticky header.
        let ancestor = shell.current?.parentElement;
        while (ancestor && ancestor !== document.body && !/^(auto|scroll|hidden|overlay)$/.test(getComputedStyle(ancestor).overflowY)) {
            ancestor = ancestor.parentElement;
        }
        const scrollRoot = ancestor && ancestor !== document.body ? ancestor : window;
        const sync = () => setScrolled((scrollRoot instanceof HTMLElement ? scrollRoot.scrollTop : window.scrollY) > 0);
        sync();
        scrollRoot.addEventListener('scroll', sync, { passive: true });
        return () => scrollRoot.removeEventListener('scroll', sync);
    }, []);

    return <div ref={shell} className="suite-appbar-shell" data-scrolled={scrolled || undefined}>
        <header className="suite-appbar" data-compact={Boolean(compact && narrow) || undefined}>
            {compact && narrow ? <CompactControls {...compact} showApps={showApps} /> : <>
                <div className="suite-appbar-identity">
                    <AppBarLogo compact />
                    {current && <><current.icon size={23} /><span className="suite-appbar-name">{current.name}</span></>}
                    {breadcrumbs && <div className="suite-appbar-breadcrumbs">{breadcrumbs}</div>}
                </div>
                <div className="suite-appbar-actions">
                    {tools}
                    {actions}
                    <AppBarSuiteActions showApps={showApps} />
                </div>
            </>}
        </header>
    </div>;
}
