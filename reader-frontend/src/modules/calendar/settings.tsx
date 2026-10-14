import { useRef, useState } from 'react';
import { Button } from '@modules/core/ui/primitives/button';
import { calendarApi, CalendarApiError, type CalendarPreferences } from './api';
import { CalendarDialog, CalendarSelect, Field } from './ui';
import { viewLabels } from './model';

export function CalendarSettings({ preferences, version, onClose, onSaved }: { preferences: CalendarPreferences; version: number; onClose: () => void; onSaved: (preferences: CalendarPreferences, version: number) => void }) {
  const [draft, setDraft] = useState(preferences), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  // The revision belongs to the visible draft, even when another tab refreshes the page behind it.
  const [draftVersion, setDraftVersion] = useState(version), [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  const change = <K extends keyof CalendarPreferences>(key: K, value: CalendarPreferences[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  async function reload() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      const result = await calendarApi.preferences();
      setDraft(result.preferences); setDraftVersion(result.version); setConflict(false);
      onSaved(result.preferences, result.version);
    } catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t reload settings.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <CalendarDialog title="Calendar settings" onClose={onClose} busy={busy}><form className="calendar-form" onSubmit={async e => {
    e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const result = await calendarApi.savePreferences(draft, draftVersion); onSaved(result.preferences, result.version); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t save settings.'); if (error instanceof CalendarApiError && error.status === 409) setConflict(true); }
    finally { lock.current = false; setBusy(false); }
  }}>
    {error && <p role="alert" className="calendar-error">{error}</p>}
    {conflict && <div className="calendar-help"><p>Your draft is still here. Load the latest settings to replace it, then make your changes again.</p><Button type="button" variant="outlined" disabled={busy} onClick={() => void reload()}>Load latest settings</Button></div>}
    <Field label="Display timezone"><input required maxLength={100} value={draft.timeZone} onChange={e => change('timeZone', e.target.value)} /></Field>
    <div className="calendar-form-grid"><Field label="Week begins"><CalendarSelect label="First day of week" value={String(draft.firstDay)} items={{ '0': 'Sunday', '1': 'Monday' }} onChange={value => change('firstDay', Number(value) as 0 | 1)} /></Field><Field label="Default view"><CalendarSelect label="Default calendar view" value={draft.defaultView} items={viewLabels} onChange={value => change('defaultView', value as CalendarPreferences['defaultView'])} /></Field></div>
    <fieldset className="calendar-repeat"><legend>Working hours</legend><div className="calendar-form-grid"><Field label="Start hour"><input type="number" min={0} max={23} value={draft.workStart} required onChange={e => change('workStart', Number(e.target.value))} /></Field><Field label="End hour"><input type="number" min={1} max={24} value={draft.workEnd} required onChange={e => change('workEnd', Number(e.target.value))} /></Field></div><div className="calendar-weekdays" role="group" aria-label="Working days">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <button type="button" key={day} aria-pressed={draft.workDays.includes(i)} onClick={() => change('workDays', draft.workDays.includes(i) ? draft.workDays.filter(value => value !== i) : [...draft.workDays, i])}>{day}</button>)}</div></fieldset>
    <Field label="Default event duration (minutes)"><input type="number" min={5} max={480} step={5} required value={draft.defaultMinutes} onChange={e => change('defaultMinutes', Number(e.target.value))} /></Field>
    <Field label="Color events by"><CalendarSelect label="Color events by" value={draft.colorBy} items={{ event: 'Event color', list: 'Task list', priority: 'Task priority' }} onChange={value => change('colorBy', value as CalendarPreferences['colorBy'])} /></Field>
    <fieldset className="calendar-repeat"><legend>Show by default</legend>{([['showHabits', 'Habits'], ['showFocus', 'Focus history'], ['showCompleted', 'Completed items']] as const).map(([key, label]) => <label key={key} className="calendar-checkbox"><input type="checkbox" checked={draft[key]} onChange={e => change(key, e.target.checked)} />{label}</label>)}</fieldset>
    <footer><Button type="button" variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" loading={busy}>Save settings</Button></footer>
  </form></CalendarDialog>;
}
