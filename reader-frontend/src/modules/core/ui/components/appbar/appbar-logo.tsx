import { Link } from 'react-router-dom';
import { homePageRoute } from '@boot/routes';
import { BrandLockup } from '@modules/core/branding';
import '@modules/core/apps/suite.css';

export function AppBarLogo({ compact = false }: { compact?: boolean }) {
    return <Link to={homePageRoute} aria-label="do100x home" className={`suite-logo${compact ? ' suite-logo-compact' : ''}`}>
        <BrandLockup compact={compact} />
    </Link>;
}
