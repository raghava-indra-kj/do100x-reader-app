import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { homePageRoute } from '@boot/routes';
import { Button } from '@modules/core/ui/primitives/button';
import { Popover } from '@modules/core/ui/primitives/popover';
import { activeSuiteApp, suiteApps } from './app-catalog';
import { HomeIcon, LauncherIcon } from '@modules/core/branding';
import './suite.css';

export function AppsSwitcher({ compact = false }: { compact?: boolean }) {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const current = activeSuiteApp(pathname);
    useEffect(() => { setOpen(false); }, [pathname]);

    return <Popover open={open} onOpenChange={setOpen} align="end" popupClassName={compact ? 'suite-appbar-popup' : undefined} content={
        <nav aria-label="Apps" className="suite-apps-menu">
            {suiteApps.map(({ id, name, route, icon: Icon }) =>
                <Link key={id} to={route} onClick={() => setOpen(false)} aria-current={current?.id === id ? 'page' : undefined}>
                    <Icon size={38} />
                    <span>{name}</span>
                </Link>)}
            <Link to={homePageRoute} aria-current={pathname === homePageRoute ? 'page' : undefined} onClick={() => setOpen(false)}>
                <HomeIcon size={38} />
                <span>Home</span>
            </Link>
        </nav>
    }>
        <Button type="button" variant="outlined" size="sm" iconOnly={compact} aria-label="Switch apps" className="suite-switcher">
            <LauncherIcon />
            {!compact && <><span className="hidden sm:inline">Apps</span><ChevronDown size={12} aria-hidden="true" className="hidden sm:block" /></>}
        </Button>
    </Popover>;
}
