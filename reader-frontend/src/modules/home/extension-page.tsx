import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppBar } from '@modules/core/ui/components/appbar';
import './home.css';

type Release = { version: string; url: string; bytes: number };
export default function ExtensionPage() {
    const [release, setRelease] = useState<Release | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        fetch('/downloads/extension-release.json', { signal: controller.signal, cache: 'no-cache' })
            .then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
            .then(data => {
                if (!/^\d+\.\d+\.\d+$/.test(data.version) || data.url !== `/downloads/do100x-reader-${data.version}.zip` || !Number.isFinite(data.bytes)) throw new Error('Invalid release');
                setRelease(data);
            }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
        return () => controller.abort();
    }, []);
    return <div className="suite-home"><AppBar /><main className="suite-extension-page">
        <Link to="/" className="suite-home-explore">← Back to home</Link>
        <p className="suite-home-eyebrow">Chrome extension · Beta</p>
        <h1>Your reading space,<br />on any page.</h1>
        <p className="suite-home-description">Read selected text, articles and pasted Markdown with comfortable fonts, a searchable outline, diagrams and LaTeX math.</p>
        <div className="suite-home-hero-actions">
            {release ? <a className="suite-home-sign-in" href={release.url} download>Download Chrome extension · v{release.version}</a>
                : <p role="status">{failed ? 'The download is not available in this build. Please try again after the next release.' : 'Checking the latest download…'}</p>}
        </div>
        <p className="suite-home-sign-in-note">Desktop Chrome 123 or newer. This beta uses manual installation; it is not a Chrome Web Store listing.</p>
        <section><h2>Install once, read anywhere</h2><ol>
            <li>Download the ZIP and extract it to a folder you will keep.</li>
            <li>Open <code>chrome://extensions</code> in Chrome and enable <strong>Developer mode</strong>.</li>
            <li>Choose <strong>Load unpacked</strong> and select the extracted folder containing <code>manifest.json</code>.</li>
            <li>Pin do100x Reader. Select text on a website, right-click and choose <strong>Read selection in do100x</strong>, or open the extension to read an article or paste content.</li>
        </ol></section>
        <section><h2>Choose what to keep</h2><p>Local reading stays in this browser. Choose the account option and sign in to send a capture to your do100x temporary inbox. Account captures expire after 7 days unless you move them to your pages.</p></section>
        <section><h2>Updating the beta</h2><p>Download the new version, replace the files in the same extension folder, then select Reload on its card in Chrome’s extension manager. Keep important reading in your pages before replacing or removing the extension. Automatic updates will be available after a Chrome Web Store release.</p></section>
    </main></div>;
}
