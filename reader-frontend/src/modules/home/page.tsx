import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { loginPageRoute, settingsPageRoute, vocabularyPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { suiteApps } from '@modules/core/apps/app-catalog';
import { featureImages, ReaderExtensionIcon, SettingsIcon, VocabularyIcon, workspaceImage } from '@modules/core/branding';
import './home.css';
import './workspace.css';

function ExtensionLink() {
    return <Link to="/chrome-extension" className="suite-home-extension">
        <ReaderExtensionIcon />
        <span className="suite-home-extension-name">
            <strong>do100x Reader</strong>
            <span>Chrome extension</span>
        </span>
        <span className="suite-home-extension-action">Get extension <ArrowRight size={14} aria-hidden="true" /></span>
    </Link>;
}

function AppLinks({ illustrated }: { illustrated: boolean }) {
    return <nav id="home-tools" className={illustrated ? 'workspace-apps' : 'suite-home-apps'} aria-label="Choose an app">
        {suiteApps.map(({ id, name, route, icon: Icon, description }) =>
            illustrated ? <Link key={id} to={route} className="workspace-app" data-app={id} aria-label={`Open ${name}`}>
                <img className="workspace-app-photo" src={featureImages[id]} alt="" width={1096} height={822}
                    loading={id === 'reader' ? 'eager' : 'lazy'} />
                <div className="workspace-app-copy">
                    <Icon size={34} />
                    <h2>{name}</h2>
                    <p>{description}</p>
                    <span className="workspace-app-open" aria-hidden="true">
                        <span>Open<span className="workspace-app-open-name"> {name}</span></span>
                        <ArrowRight size={15} />
                    </span>
                </div>
            </Link> : <Link key={id} to={route} className={`suite-home-card suite-home-card-${id}`} aria-label={`Open ${name}`}>
                <div className="suite-home-card-top"><Icon size={38} /><ArrowUpRight size={19} className="suite-home-arrow" aria-hidden="true" /></div>
                <h2>{name}</h2>
                <p className="suite-home-card-description">{description}</p>
            </Link>)}
    </nav>;
}

function WorkspaceShortcuts() {
    return <nav className="workspace-shortcuts" aria-label="Quick access">
        <Link to="/chrome-extension">
            <ReaderExtensionIcon />
            <span><strong>Reader for Chrome</strong><small>Get the extension</small></span>
            <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to={vocabularyPageRoute}>
            <VocabularyIcon size={42} />
            <span><strong>Vocabulary</strong><small>Review your saved words.</small></span>
            <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to={settingsPageRoute}>
            <SettingsIcon size={42} />
            <span><strong>Settings</strong><small>Account and preferences</small></span>
            <ArrowRight size={16} aria-hidden="true" />
        </Link>
    </nav>;
}

export default observer(function HomePage() {
    const auth = useAuthStore();
    const marketing = auth.status === 'anonymous';

    return <div className={`suite-home ${marketing ? 'suite-home-marketing' : 'suite-home-workspace'}`}>
        <AppBar />
        <main className="suite-home-main suite-home-landing-main">
            <div className="suite-home-content suite-home-landing-content">
                {marketing ? <section className="suite-home-hero" aria-labelledby="suite-home-title">
                    <div className="suite-home-hero-copy">
                        <h1 id="suite-home-title"><span>Your day,</span>{' '}<em>in one place.</em></h1>
                        <p className="suite-home-description">Save reading notes, plan tasks on your calendar, track spending, and build habits.</p>
                        <div className="suite-home-hero-actions">
                            <Link to={loginPageRoute} className="suite-home-sign-in">Continue with Google <ArrowRight size={18} aria-hidden="true" /></Link>
                            <a href="#home-tools" className="suite-home-explore">Explore apps <ArrowDown size={15} aria-hidden="true" /></a>
                        </div>
                    </div>
                    <div className="suite-home-visual">
                        <img src={workspaceImage} alt="" width="1200" height="800" fetchPriority="high" />
                        <ExtensionLink />
                    </div>
                </section> : <>
                    <h1 className="sr-only">Workspace</h1>
                    {auth.status === 'loading' && <p role="status" className="suite-home-session-status">Checking sign-in…</p>}
                    {auth.status === 'error' && <div className="suite-home-session-error">
                        <p role="alert">{auth.error}</p>
                        <Button variant="outlined" size="sm" onClick={() => void auth.bootstrap()}>Retry sign-in check</Button>
                    </div>}
                </>}

                {marketing && <h2 className="suite-home-apps-heading">Explore the apps</h2>}
                <AppLinks illustrated={auth.isAuthenticated} />
                {auth.isAuthenticated ? <WorkspaceShortcuts /> : !marketing && <ExtensionLink />}
            </div>
        </main>
    </div>;
});
