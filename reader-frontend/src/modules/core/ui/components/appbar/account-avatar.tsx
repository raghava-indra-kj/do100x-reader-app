import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { settingsPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';

export const AccountAvatar = observer(function AccountAvatar() {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) return null;
    const label = auth.currentUser.label || 'User';
    return <Link to={settingsPageRoute} className="suite-account-avatar"
        title={`Account settings — ${label}`} aria-label={`Account settings — ${label}`}>
        <span aria-hidden="true">{label.charAt(0).toUpperCase()}</span>
    </Link>;
});
