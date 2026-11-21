import { AppBar } from '@modules/core/ui/components/appbar';
import { BrandMark } from '@modules/core/branding';
import { Button } from '@modules/core/ui/primitives/button';
import { observer } from 'mobx-react-lite';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../provider/store';
import { FeatureGallery } from './feature-gallery';
import { GoogleSignIn } from './google-sign-in';
import { safeReturnPath } from './return-path';
import './login.css';

export default observer(function LoginPage() {
    const auth = useAuthStore();
    const location = useLocation();
    if (auth.isAuthenticated) return <Navigate to={safeReturnPath(location.state?.returnTo)} replace />;
    return <div className="login-page">
        <AppBar />
        <main className="login-main" aria-labelledby="login-title">
            <div className="login-card">
                <div className="login-content">
                    <BrandMark size={44} />
                    <h1 id="login-title">Sign in to do100x</h1>
                    <div className="login-controls">
                        {auth.status === 'loading' ? <p role="status">Checking sign-in…</p>
                            : auth.status === 'error' ? <div className="login-retry">
                                <p role="alert">{auth.error}</p>
                                <Button variant="outlined" onClick={() => void auth.bootstrap()}>Retry</Button>
                            </div>
                            : <GoogleSignIn />}
                    </div>
                </div>
                <FeatureGallery />
            </div>
        </main>
    </div>;
});
