import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AppBar } from '@modules/core/ui/components/appbar';
import { suiteApps } from '@modules/core/apps/app-catalog';
import './home.css';

export default function HomePage() {
    return <div className="suite-home">
        <AppBar />
        <main className="suite-home-main">
            <div className="suite-home-content">
                <section className="suite-home-intro" aria-labelledby="suite-home-title">
                    <h1 id="suite-home-title">Your apps</h1>
                </section>
                <nav className="suite-home-apps" aria-label="Choose an app">
                    {suiteApps.map(({ id, name, route, icon: Icon, description }) =>
                        <Link key={id} to={route} className={`suite-home-card suite-home-card-${id}`} aria-label={`Open ${name}`}>
                            <div className="suite-home-card-top"><span className="suite-home-icon"><Icon size={24} aria-hidden="true" /></span><ArrowUpRight size={19} className="suite-home-arrow" aria-hidden="true" /></div>
                            <h2>{name}</h2>
                            <p className="suite-home-card-description">{description}</p>
                            <div className="suite-home-card-footer"><span className="suite-home-open">Open {name} <ArrowUpRight size={14} aria-hidden="true" /></span></div>
                        </Link>)}
                </nav>
            </div>
        </main>
    </div>;
}
