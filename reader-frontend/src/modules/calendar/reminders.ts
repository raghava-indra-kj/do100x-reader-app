import { useEffect, useState } from 'react';
import { addDays, wallAt } from '@reader/calendar-core';
import { calendarApi } from './api';
import { deliverCalendarReminders, dueCalendarReminders } from './reminder-delivery';

/** Notifications are opt-in and local to an open Calendar; never promise background delivery. */
export function useCalendarReminders(userId: string, timeZone: string, onNotice: (notice: string) => void) {
  const key = `do100x.calendar.reminders.${userId}`;
  const [enabled, setEnabled] = useState(() => { try { return localStorage.getItem(key) === 'on'; } catch { return false; } });
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let stopped = false, running = false;
    const delivered = new Map<string, number>();
    const check = async () => {
      if (running) return; running = true;
      try {
        const now = Date.now(), date = wallAt(new Date(now), timeZone).slice(0, 10);
        const result = await calendarApi.range(addDays(date, -1), addDays(date, 8), timeZone);
        if (stopped || Notification.permission !== 'granted') return;
        let storage: Storage | null = null;
        try { storage = localStorage; } catch { /* Session receipts work without storage access. */ }
        deliverCalendarReminders(dueCalendarReminders(result, new Date(now)), key, now, delivered, storage, ({ event, occurrence }, receipt) => {
          const notification = new Notification(event.title, { body: `${wallAt(occurrence.startInstant, timeZone).replace('T', ' ')}${event.location ? ` · ${event.location}` : ''}`, tag: receipt });
          notification.onclick = () => { window.focus(); notification.close(); };
        });
        for (let index = localStorage.length - 1; index >= 0; index--) { const name = localStorage.key(index); if (name?.startsWith(`${key}.sent.`) && Number(localStorage.getItem(name)) < now - 8 * 86400000) localStorage.removeItem(name); }
      } catch { /* Retry on the next tick without interrupting planning. */ }
      finally { running = false; }
    };
    void check(); const timer = setInterval(() => void check(), 30000);
    return () => { stopped = true; clearInterval(timer); };
  }, [enabled, key, timeZone]);
  async function toggle() {
    if (enabled) { setEnabled(false); try { localStorage.setItem(key, 'off'); } catch {} return; }
    if (typeof Notification === 'undefined') { onNotice('This browser does not support notifications. Reminder times are still saved.'); return; }
    try {
      if (await Notification.requestPermission() !== 'granted') { onNotice('Allow notifications in the browser’s site settings to receive reminders.'); return; }
      setEnabled(true); try { localStorage.setItem(key, 'on'); } catch {}
      onNotice('Reminders are enabled while Calendar is open.');
    } catch { onNotice('Couldn’t enable browser notifications.'); }
  }
  return { enabled, toggle };
}
