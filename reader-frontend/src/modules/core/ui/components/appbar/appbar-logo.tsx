import { Link } from 'react-router-dom';
import { homePageRoute } from '@boot/routes';
import '@modules/core/apps/suite.css';

export function AppBarLogo({ compact = false }: { compact?: boolean }) {
    return <Link to={homePageRoute} aria-label="do100x home" className={`suite-logo${compact ? ' suite-logo-compact' : ''}`}>
        <img src="/branding/do100x-wordmark.png" alt="do100x" width="960" height="326" />
    </Link>;
}
