import { ReaderIcon } from './app-icons';
import './branding.css';

export function BrandMark({ size = 30, alt = '' }: { size?: number; alt?: string }) {
    return <img src="/branding/do100x-mark.svg" width={size} height={size} alt={alt} />;
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
    return <span className="brand-lockup">
        <BrandMark size={compact ? 26 : 30} />
        <span className="suite-wordmark">do100<span>x</span></span>
    </span>;
}

export function ReaderExtensionIcon() {
    return <span className="brand-reader-extension" aria-hidden="true"><ReaderIcon size={42} /></span>;
}
