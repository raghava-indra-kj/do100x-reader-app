import { useEffect, useState } from 'react';
import { searchPages } from '@domain/page/services/pages-service';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { getApiErrorMessage } from '@core/api/api-client';
import { keepCapture } from './api';

export function KeepCaptureDialog({ pageId, open, onClose, onSaved }: { pageId: string; open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<{ id: string; title: string; path: string }[]>([]);
    const [destination, setDestination] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!open) return;
        let active = true;
        const timeout = setTimeout(() => {
            void searchPages({ q: query, limit: 20 }).then(result => {
                if (!active) return;
                if (result.ok) setItems(result.data.items.map(item => ({ id: item.id, title: item.title, path: item.ancestors.map(parent => parent.title).join(' / ') })));
                else setError(result.error.message);
            });
        }, 200);
        return () => { active = false; clearTimeout(timeout); };
    }, [query, open]);
    const save = async () => {
        setSaving(true); setError(null);
        try { const result = await keepCapture(pageId, destination); onSaved(result.id); }
        catch (cause) { setError(getApiErrorMessage(cause, 'Couldn’t keep this capture. Try again.')); }
        finally { setSaving(false); }
    };
    return <Dialog open={open} onOpenChange={value => { if (!value && !saving) onClose(); }}>
        <div className="capture-dialog">
            <h2>Keep in my pages</h2>
            <p>Choose a destination. Your content, notes and quizzes stay on this page, and it will no longer expire.</p>
            <p>Kept pages follow their destination’s sharing settings. Choose a private destination for private content.</p>
            <Input aria-label="Find destination page" placeholder="Search your saved pages…" value={query} onChange={event => setQuery(event.target.value)} />
            <div className="capture-destinations" role="radiogroup" aria-label="Destination page">
                <label><input type="radio" name="capture-destination" checked={destination === null} onChange={() => setDestination(null)} /> My Reader home</label>
                {items.map(item => <label key={item.id}><input type="radio" name="capture-destination" checked={destination === item.id} onChange={() => setDestination(item.id)} /><span>{item.title}{item.path && <small>{item.path}</small>}</span></label>)}
            </div>
            {error && <p role="alert">{error}</p>}
            <div className="capture-actions"><Button variant="outlined" disabled={saving} onClick={onClose}>Cancel</Button><Button loading={saving} disabled={saving} onClick={() => void save()}>Keep page</Button></div>
        </div>
    </Dialog>;
}
