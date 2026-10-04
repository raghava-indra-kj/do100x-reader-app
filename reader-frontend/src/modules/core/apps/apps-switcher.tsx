import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { homePageRoute } from '@boot/routes';
import { Button } from '@modules/core/ui/primitives/button';
import { Popover } from '@modules/core/ui/primitives/popover';
import { activeSuiteApp, suiteApps } from './app-catalog';
import './suite.css';

export function AppsSwitcher({ compact = false }: { compact?: boolean }) {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const current = activeSuiteApp(pathname);
    useEffect(() => { setOpen(false); }, [pathname]);

    return <Popover open={open} onOpenChange={setOpen} align="end" content={
        <nav aria-label="Apps" className="suite-apps-menu">
            {suiteApps.map(({ id, name, route, icon: Icon }) =>
                <Link key={id} to={route} onClick={() => setOpen(false)} aria-current={current?.id === id ? 'page' : undefined}>
                    <Icon size={18} aria-hidden="true" />
                    <strong>{name}</strong>
                </Link>)}
            <Link to={homePageRoute} onClick={() => setOpen(false)} className="suite-apps-home">
                <LayoutGrid size={16} aria-hidden="true" /> Home
            </Link>
        </nav>
    }>
        <Button type="button" variant="outlined" size="sm" iconOnly={compact} aria-label="Switch apps" className="suite-switcher">
            <LayoutGrid size={16} aria-hidden="true" />
            {!compact && <><span className="hidden sm:inline">Apps</span><ChevronDown size={12} aria-hidden="true" className="hidden sm:block" /></>}
        </Button>
    </Popover>;
}
