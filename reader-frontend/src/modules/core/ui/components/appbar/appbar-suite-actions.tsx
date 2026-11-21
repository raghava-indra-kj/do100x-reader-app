import { AppsSwitcher } from '@modules/core/apps/apps-switcher';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { AccountAvatar } from './account-avatar';

export function AppBarSuiteActions({ showApps = true, inOverflow = false }: { showApps?: boolean; inOverflow?: boolean }) {
    return <>
        {showApps && <AppsSwitcher compact={!inOverflow} />}
        <ThemeSelector compact className={inOverflow ? 'h-9 py-0 text-sm' : 'suite-appbar-theme h-8 py-0 text-xs'} />
        <AccountAvatar />
    </>;
}
