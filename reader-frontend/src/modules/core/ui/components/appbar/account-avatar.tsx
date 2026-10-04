import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { settingsPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';

function AccountPhoto({ src, initial }: { src: string; initial: string }) {
    const [failed, setFailed] = useState(false);
    if (failed) return <span aria-hidden="true">{initial}</span>;
    return <img src={src} alt="" aria-hidden="true" referrerPolicy="no-referrer"
        onError={() => setFailed(true)} />;
}

export const AccountAvatar = observer(function AccountAvatar() {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) return null;
    const label = auth.currentUser.label || 'User';
    const initial = label.charAt(0).toUpperCase();
    const avatarUrl = auth.currentUser.avatarUrl;
    return <Link to={settingsPageRoute} className="suite-account-avatar"
        title={`Account settings — ${label}`} aria-label={`Account settings — ${label}`}>
        {avatarUrl
            ? <AccountPhoto key={`${auth.currentUser.id}:${avatarUrl}`} src={avatarUrl} initial={initial} />
            : <span aria-hidden="true">{initial}</span>}
    </Link>;
});
