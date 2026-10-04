import { Link } from 'react-router-dom';
import { homePageRoute } from '@boot/routes';
import { AppBar } from '@modules/core/ui/components/appbar';
import './home.css';

export default function NotFoundPage() {
    return <div className="suite-home">
        <AppBar />
        <main className="suite-home-main">
            <div className="suite-home-content">
                <p className="suite-home-eyebrow">404 · do100x</p>
                <h1>Page not found</h1>
                <p className="suite-home-description">This page doesn’t exist. Go home to choose an app.</p>
                <Link to={homePageRoute} className="inline-block mt-6 text-[var(--color-brand-on-soft)] underline underline-offset-4">Go home</Link>
            </div>
        </main>
    </div>;
}
