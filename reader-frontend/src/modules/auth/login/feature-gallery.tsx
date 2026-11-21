import { useState } from 'react';
import { suiteApps } from '@modules/core/apps/app-catalog';
import { featureImages } from '@modules/core/branding';

export function FeatureGallery() {
    const [activeApp, setActiveApp] = useState<typeof suiteApps[number]>(suiteApps[0]);

    return <section className="login-gallery" aria-label="App previews">
        <figure className="login-preview" id="login-app-preview">
            <img key={activeApp.id} src={featureImages[activeApp.id]} alt="" />
            <figcaption aria-live="polite" aria-atomic="true">
                <h2>{activeApp.name}</h2>
                <p>{activeApp.description}</p>
            </figcaption>
        </figure>
        <div className="login-gallery-picker" role="group" aria-label="Choose an app preview">
            {suiteApps.map(app => <button key={app.id} type="button"
                aria-pressed={activeApp.id === app.id} aria-controls="login-app-preview"
                onClick={() => setActiveApp(app)}>
                <app.icon size={25} />
                <span>{app.name}</span>
            </button>)}
        </div>
    </section>;
}
