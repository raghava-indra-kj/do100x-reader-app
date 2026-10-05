import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ListTodo, Settings2, Wallet } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { loginPageRoute, settingsPageRoute, vocabularyPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { suiteApps } from '@modules/core/apps/app-catalog';
import './home.css';

const appFeatures = {
    reader: ['Organize pages and subpages', 'Save words to learn', 'Check your understanding with quizzes'],
    finance: ['Keep your accounts together', 'Record income and expenses', 'Plan bills and forecast cash flow'],
    tasks: ['Organize tasks into lists', 'Set priorities and due dates', 'Track time spent on each task'],
} satisfies Record<typeof suiteApps[number]['id'], string[]>;

/** An illustrative preview only, never a summary of the user's private data. */
function WorkspacePreview() {
    return <div className="suite-home-preview" aria-hidden="true">
        <div className="suite-home-preview-heading"><span>do100x</span><span>Example workspace</span></div>
        <div className="suite-home-preview-body">
            <div className="suite-home-preview-reader">
                <div className="suite-home-preview-label"><BookOpen size={15} /> Reader</div>
                <p className="suite-home-preview-title">Ideas worth keeping</p>
                <p>Read a little. Make a note. Come back to what matters.</p>
                <div className="suite-home-preview-lines"><span /><span /></div>
                <span className="suite-home-preview-word">Save a new word</span>
            </div>
            <div className="suite-home-preview-bottom">
                <div className="suite-home-preview-tasks">
                    <div className="suite-home-preview-label"><ListTodo size={15} /> Tasks</div>
                    <div className="suite-home-preview-task"><span className="suite-home-preview-check"><Check size={12} /></span><span>Plan the week</span></div>
                    <div className="suite-home-preview-task"><span className="suite-home-preview-checkbox" /><span>Make time to read</span></div>
                </div>
                <div className="suite-home-preview-finance">
                    <div className="suite-home-preview-label"><Wallet size={15} /> Finance</div>
                    <p className="suite-home-preview-title">Upcoming bills</p>
                    <div className="suite-home-preview-bill"><span>Electricity</span><span>Monthly</span></div>
                    <div className="suite-home-preview-bill"><span>Phone</span><span>Monthly</span></div>
                </div>
            </div>
        </div>
    </div>;
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
                        <p className="suite-home-eyebrow">Reader · Tasks · Finance</p>
                        <h1 id="suite-home-title">Read better.<br />Plan your day.<br /><span>Track your money.</span></h1>
                        <p className="suite-home-description">Keep your reading, to-dos and finances organized—with a clear place for each.</p>
                        <div className="suite-home-hero-actions">
                            <Link to={loginPageRoute} className="suite-home-sign-in">Sign in to get started <ArrowRight size={18} aria-hidden="true" /></Link>
                            <a href="#home-tools" className="suite-home-explore">Explore tools <ArrowRight size={15} aria-hidden="true" /></a>
                        </div>
                        <p className="suite-home-sign-in-note">Continue with Google.</p>
                    </div>
                    <WorkspacePreview />
                </section> : <section className="suite-home-intro" aria-labelledby="suite-home-title">
                    <h1 id="suite-home-title">Your apps</h1>
                    {auth.status === 'loading' && <p role="status" className="suite-home-session-status">Checking sign-in…</p>}
                    {auth.status === 'error' && <div className="suite-home-session-error">
                        <p role="alert">{auth.error}</p>
                        <Button variant="outlined" size="sm" onClick={() => void auth.bootstrap()}>Retry sign-in check</Button>
                    </div>}
                </section>}

                {marketing && <div className="suite-home-apps-heading"><h2>Choose your tool</h2><p>Start with what you need today.</p></div>}
                <nav id="home-tools" className="suite-home-apps" aria-label="Choose an app">
                    {suiteApps.map(({ id, name, route, icon: Icon, description }) =>
                        <Link key={id} to={route} className={`suite-home-card suite-home-card-${id}`} aria-label={`Open ${name}`}>
                            <div className="suite-home-card-top"><span className="suite-home-icon"><Icon size={23} aria-hidden="true" /></span><ArrowUpRight size={19} className="suite-home-arrow" aria-hidden="true" /></div>
                            <h2>{name}</h2>
                            <p className="suite-home-card-description">{description}</p>
                            {marketing && <ul className="suite-home-features">{appFeatures[id].map(feature => <li key={feature}><Check size={14} aria-hidden="true" />{feature}</li>)}</ul>}
                            <div className="suite-home-card-footer"><span className="suite-home-open">{marketing ? 'Start with' : 'Open'} {name} <ArrowRight size={15} aria-hidden="true" /></span></div>
                        </Link>)}
                </nav>

                {auth.isAuthenticated && <nav className="suite-home-shortcuts" aria-label="Quick access">
                    <Link to={vocabularyPageRoute} className="suite-home-shortcut">
                        <BookOpen size={19} aria-hidden="true" />
                        <span><strong>Vocabulary</strong><span>Review your saved words.</span></span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                    <Link to={settingsPageRoute} className="suite-home-shortcut">
                        <Settings2 size={19} aria-hidden="true" />
                        <span><strong>Settings</strong><span>Account, preferences and AI connections.</span></span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                </nav>}
            </div>
        </main>
    </div>;
});
