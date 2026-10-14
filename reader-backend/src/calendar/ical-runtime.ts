import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { IcalRequest, ExternalOccurrence } from './ical-parser';
import { CalendarError } from './calendar-service';
let active = 0;
export function readIcal(input: IcalRequest): Promise<Omit<ExternalOccurrence, 'sourceId' | 'sourceName' | 'color'>[]> {
  if (active >= 2) return Promise.reject(new CalendarError(429, 'Other calendars are being read. Try again in a moment.'));
  active++;
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try { worker = new Worker(path.resolve(__dirname, __filename.endsWith('.ts') ? '../../dist/ical-worker.js' : 'ical-worker.js'), { workerData: input, resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 } }); }
    catch { active--; reject(new CalendarError(503, 'Calendar reader is temporarily unavailable. Please try again.')); return; }
    let settled = false;
    const done = (error?: Error, items?: Omit<ExternalOccurrence, 'sourceId' | 'sourceName' | 'color'>[]) => { if (settled) return; settled = true; active--; clearTimeout(timer); void worker.terminate(); if (error) reject(error); else resolve(items!); };
    const timer = setTimeout(() => done(new CalendarError(400, 'This calendar is too complex to read within six seconds. Export a smaller calendar.')), 6000);
    worker.once('message', result => done(result.error ? new CalendarError(400, String(result.error).slice(0, 500)) : undefined, result.items));
    worker.once('error', () => done(new CalendarError(400, 'This calendar could not be read within the resource limit.')));
    worker.once('exit', () => { if (!settled) done(new CalendarError(400, 'Calendar reader stopped before finishing.')); });
  });
}
