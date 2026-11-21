import { format, isValid, parseISO } from 'date-fns';
import { Check, Coffee, Hourglass, Pencil } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useAuthStore } from '@modules/auth/provider/store';
import { ProviderMark } from '@modules/core/branding/provider-mark';
import { useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';
import { LogoutButton } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { getLifePerspectiveConfig, saveLifePerspectiveConfig } from '@modules/core/utils/time-perspective';
import './account-panel.css';

function TimePerspective() {
    const [saved, setSaved] = useState(getLifePerspectiveConfig);
    const [editing, setEditing] = useState(false);
    const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);
    const editButton = useRef<HTMLButtonElement>(null);
    const fieldsId = useId();
    const birthDate = parseISO(saved.dob);

    function closeEditor() {
        setEditing(false);
        editButton.current?.focus();
    }

    function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        const values = new FormData(event.currentTarget);
        const dob = String(values.get('dob'));
        const lifespanYears = Number(values.get('lifespan'));
        saveLifePerspectiveConfig({ dob, lifespanYears });
        const stored = getLifePerspectiveConfig();
        if (stored.dob !== dob || stored.lifespanYears !== lifespanYears) {
            setFeedback('error');
            return;
        }
        setSaved(stored);
        setFeedback('saved');
        closeEditor();
    }

    return <div className="account-pref-row">
        <Hourglass className="account-pref-icon" size={20} aria-hidden="true" />
        <div className="account-pref-copy">
            <h3>Time perspective</h3>
            <p className="settings-description">Use your birth date and estimated lifespan for the break screen on this device.</p>
        </div>
        <Button ref={editButton} size="sm" variant="outlined" type="button" aria-expanded={editing} aria-controls={fieldsId}
            aria-label={editing ? 'Cancel editing time perspective' : 'Edit time perspective'} startIcon={!editing && <Pencil size={14} aria-hidden="true" />}
            onClick={() => {
                setFeedback(null);
                if (editing) closeEditor();
                else {
                    setSaved(getLifePerspectiveConfig());
                    setEditing(true);
                }
            }}>{editing ? 'Cancel' : 'Edit'}</Button>
        <div id={fieldsId} className="account-pref-detail">
            {editing ? <form onSubmit={save} className="account-time-form">
                <div className="account-time-values">
                    <label className="settings-field">
                        <span>Date of birth</span>
                        <Input type="date" name="dob" autoFocus required max={format(new Date(), 'yyyy-MM-dd')} defaultValue={saved.dob} />
                    </label>
                    <label className="settings-field">
                        <span>Estimated lifespan (years)</span>
                        <Input type="number" name="lifespan" required min={1} max={130} step={1} defaultValue={saved.lifespanYears} />
                    </label>
                </div>
                <Button size="sm" type="submit">Save changes</Button>
                {feedback === 'error' && <p role="alert" className="account-feedback-error">Couldn’t save these changes on this device. Try again.</p>}
            </form> : <dl className="account-time-values account-time-summary">
                <div><dt>Date of birth</dt><dd>{isValid(birthDate) ? birthDate.toLocaleDateString(undefined, { dateStyle: 'long' }) : saved.dob}</dd></div>
                <div><dt>Estimated lifespan</dt><dd>{saved.lifespanYears} years</dd></div>
            </dl>}
            <div role="status">{feedback === 'saved' && <span className="account-feedback-saved"><Check size={14} aria-hidden="true" />Saved on this device</span>}</div>
        </div>
    </div>;
}

export const AccountPanel = observer(function AccountPanel() {
    const { currentUser } = useAuthStore();
    const preferences = useMotivationPreferences();
    const [toggleError, setToggleError] = useState(false);
    const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
    const quotesId = useId();
    const descriptionId = useId();
    const photo = currentUser.avatarUrl;

    return <div className="settings-panel">
        <section className="settings-card account-profile" aria-label="Profile">
            <span aria-hidden="true" className="account-profile-photo">
                {currentUser.label.charAt(0).toUpperCase()}
                {photo && photo !== failedPhoto && <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(photo)} />}
            </span>
            <div className="account-profile-identity">
                <h2>{currentUser.displayName || 'Google account'}</h2>
                <p><ProviderMark provider="google" /><span><span className="sr-only">Google account email </span>{currentUser.email}</span></p>
            </div>
            <LogoutButton showLabel />
        </section>
        <section className="settings-card account-preferences">
            <h2 className="settings-card-heading">Reading preferences</h2>
            <div className="account-pref-row">
                <Coffee className="account-pref-icon" size={20} aria-hidden="true" />
                <div className="account-pref-copy">
                    <h3 id={quotesId}>Quotes and breaks</h3>
                    <p id={descriptionId} className="settings-description">Show quotes and break reminders on your private pages.</p>
                    {toggleError && <p role="alert" className="account-feedback-error">Couldn’t save this preference. Try again.</p>}
                </div>
                <button className="account-pref-switch" type="button" role="switch" aria-labelledby={quotesId} aria-describedby={descriptionId}
                    aria-checked={preferences.motivationsEnabled} aria-busy={preferences.isLoading || preferences.isSaving}
                    disabled={preferences.isLoading || preferences.isSaving}
                    onClick={async () => {
                        setToggleError(false);
                        const success = await preferences.setMotivationsEnabled(!preferences.motivationsEnabled);
                        setToggleError(!success);
                    }}>
                    <span className="account-switch-track"><span /></span>
                </button>
            </div>
            <TimePerspective />
        </section>
    </div>;
});
