import { parentPort, workerData } from 'node:worker_threads';
import { parseIcal } from './ical-parser';
try { parentPort!.postMessage({ items: parseIcal(workerData) }); }
catch (error) { parentPort!.postMessage({ error: error instanceof Error ? error.message : 'The calendar file could not be read.' }); }
