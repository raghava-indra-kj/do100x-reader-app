import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Sparkles } from 'lucide-react';
import { activeSuiteApp } from '@modules/core/apps/app-catalog';
import { useAuthStore } from '@modules/auth/provider/store';
import { Button } from '@modules/core/ui/primitives/button';
import { MotivationReelsDialog } from '../motivation-reels';
import { canShowMotivations, useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';
import { AppBarLayout } from './appbar-layout';
import { ReaderPageSearch } from '@modules/reader/search/page-search';

export const AppBar = observer(function AppBar() {
    const auth = useAuthStore();
    const preferences = useMotivationPreferences();
    const { pathname } = useLocation();
    const [reelsOpen, setReelsOpen] = useState(false);
    const available = canShowMotivations(auth.isAuthenticated, preferences.motivationsEnabled);
    useEffect(() => { if (!available) setReelsOpen(false); }, [available]);
    return <>
        <AppBarLayout app={activeSuiteApp(pathname)?.id} actions={<>
            {activeSuiteApp(pathname)?.id === 'reader' && <ReaderPageSearch />}
            {available &&
            <Button variant="outlined" size="sm" iconOnly aria-label="Take a break" tooltip="Take a break" onClick={() => setReelsOpen(true)}>
                <Sparkles size={16} aria-hidden="true" />
            </Button>}</>}
        />
        {available && <MotivationReelsDialog open={reelsOpen} onOpenChange={setReelsOpen} />}
    </>;
});
