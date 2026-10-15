'use strict';
// Runs only on an extracted artifact and the disposable database owned by habits-test-db.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const { createHmac, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { root } = require('./environment.cjs');
const { run } = require('./commands.cjs');

async function verifyCalendarRelease(directory, testEnv, db) {
  const release = fs.realpathSync(directory);
  if (path.dirname(release) !== fs.realpathSync(path.join(root, 'releases')) || !/^calendar-release-check-[a-f0-9-]+$/.test(path.basename(release))) throw new Error('Release verification requires a dedicated directory inside releases.');
  const database = new URL(testEnv.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(database.pathname)) throw new Error('Release checks require the disposable Calendar database.');
  for (const file of ['release.json', 'reader-backend/dist/index.js', 'reader-backend/dist/ical-worker.js', 'reader-frontend/dist/index.html']) assert.ok(fs.existsSync(path.join(release, file)), `Missing release file: ${file}`);
  const reservation = net.createServer();
  await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = 'https://calendar-release.example.test';
  const settings = { NODE_ENV: 'production', DATABASE_URL: database.href, APP_ORIGINS: origin, GOOGLE_CLIENT_ID: testEnv.GOOGLE_CLIENT_ID, SESSION_SECRET: testEnv.SESSION_SECRET, PORT: String(port), READER_CAPTURE_CLEANUP: '0' };
  // Replace the captured production profile BEFORE invoking any release code.
  fs.writeFileSync(path.join(release, 'reader-backend/.env.prod'), Object.entries(settings).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n'), { mode: 0o600 });
  const env = { ...testEnv, ...settings };
  console.log('Installing and preparing the extracted release against its disposable database…');
  run(process.execPath, ['scripts/prepare-hosting.cjs'], { cwd: release, env });
  const user = await db.appuser.create({ data: { email: `release-${randomUUID()}@example.test`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } });
  const payload = Buffer.from(JSON.stringify({ version: 2, userId: user.id, expires: Date.now() + 600000 })).toString('base64url');
  const cookie = `reader_session=${payload}.${createHmac('sha256', settings.SESSION_SECRET).update(payload).digest('base64url')}`;
  const child = spawn(process.execPath, ['--require', './scripts/production-env.cjs', 'reader-backend/dist/index.js'], { cwd: release, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '', processError;
  child.stdout.on('data', data => { output = (output + data).slice(-8000); });
  child.stderr.on('data', data => { output = (output + data).slice(-8000); });
  child.on('error', error => { processError = error; });
  const closed = new Promise(resolve => child.once('close', resolve));
  const base = `http://127.0.0.1:${port}`;
  const request = (url, options = {}) => fetch(`${base}${url}`, { ...options, signal: AbortSignal.timeout(10000) });
  const json = async (url, method = 'GET', body, expected = 200) => {
    const response = await request(`/backend-api${url}`, { method, headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    assert.equal(response.status, expected, `${method} ${url}: ${response.status}`);
    return response.json();
  };
  try {
    let ready = false;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (processError || child.exitCode !== null) throw new Error('Packaged server exited during startup.');
      try { ready = (await request('/backend-api/status')).ok; } catch { /* Startup has not bound its port yet. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, 'Packaged server did not become ready.');
    const html = await (await request('/calendar')).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match => match[1]);
    assert.ok(assets.length > 0, 'Frontend entry must reference bundled assets.');
    for (const asset of assets) {
      const response = await request(asset);
      assert.equal(response.status, 200, `Missing frontend asset ${asset}`);
      assert.ok(!response.headers.get('content-type')?.includes('text/html'), `SPA fallback for ${asset}`);
    }
    assert.equal((await request('/backend-api/calendar')).status, 401);
    assert.equal((await request('/backend-api/calendar/events', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    const task = await json('/tasks', 'POST', { title: 'Packaged calendar task' });
    const event = await json('/calendar/events', 'POST', { requestKey: randomUUID(), title: task.title, description: '', location: '', color: 'blue', timeZone: 'UTC', start: '2026-10-15T09:00', end: '2026-10-15T10:00', allDay: false, repeat: null, taskId: task.id, habitId: null, reminders: [] }, 201);
    assert.equal((await json(`/tasks/${task.id}`)).dueTime, '09:00');
    await json(`/calendar/events/${event.id}/occurrences/2026-10-15`, 'PUT', { expectedVersion: 0, eventVersion: event.version, start: null, end: null, allDay: null, completed: true, cancelled: false });
    assert.equal((await json(`/tasks/${task.id}`)).status, 'done');
    const plannedTask = { requestKey: randomUUID(), title: 'Create directly from Calendar', description: 'Keep in Tasks', location: '', color: 'blue', timeZone: 'UTC', start: '2026-10-15T13:00', end: '2026-10-15T14:00', allDay: false, repeat: null, taskId: null, habitId: null, reminders: [], newTask: { listId: null, priority: 2 } };
    const created = await json('/calendar/events', 'POST', plannedTask, 201);
    const repeated = await json('/calendar/events', 'POST', plannedTask, 201);
    assert.equal(repeated.taskId, created.taskId); assert.equal(repeated.id, created.id);
    assert.equal((await json(`/tasks/${created.taskId}`)).dueTime, '13:00');
    assert.equal((await json(`/tasks/${created.taskId}`)).priority, 2);
    const content = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:packaged-import\r\nSUMMARY:Packaged import\r\nDTSTART:20261015T110000Z\r\nDTEND:20261015T120000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    const source = await json('/calendar/sources', 'POST', { name: 'Packaged file', color: 'teal', timeZone: 'UTC', content }, 201);
    const range = await json('/calendar?from=2026-10-15&to=2026-10-16&timeZone=UTC');
    assert.ok(range.occurrences.some(item => item.eventId === event.id && item.completed));
    assert.ok(range.external.some(item => item.title === 'Packaged import'));
    const exported = await request(`/backend-api/calendar/sources/${source.id}/export`, { headers: { Cookie: cookie } });
    assert.equal(exported.status, 200); assert.equal(await exported.text(), content);
    assert.match(exported.headers.get('content-disposition'), /attachment/);
    await verifyPackagedMcp(release, base, user.id, db, json, source.id, content);
    console.log('Packaged release passed: startup, frontend assets, session/origin guards, task scheduling/completion and atomic creation, import worker and file export.');
  } catch (error) {
    console.error(output.replace(/mysql:\/\/[^\s]+/g, '[database connection]'));
    throw error;
  } finally {
    if (child.exitCode === null && !processError) child.kill();
    await closed;
  }
}

async function verifyPackagedMcp(release, base, userId, db, json, sourceId, sourceContent) {
  const runtimeRequire = createRequire(path.join(release, 'reader-backend/package.json'));
  const { Client } = runtimeRequire('@modelcontextprotocol/sdk/client/index.js');
  const { SSEClientTransport } = runtimeRequire('@modelcontextprotocol/sdk/client/sse.js');
  const client = new Client({ name: 'packaged-release-check', version: '1' });
  const transport = new SSEClientTransport(new URL(`${base}/mcp/sse/${userId}`));
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 10000 });
    assert.ok(!result.isError, `${name} failed in the packaged server`);
    return JSON.parse(result.content[0].text);
  };
  try {
    assert.equal((await fetch(`${base}/mcp/sse`, { signal: AbortSignal.timeout(10000) })).status, 401);
    await client.connect(transport, { timeout: 10000 });
    const { tools } = await client.listTools();
    const featureTools = tools.filter(tool => tool.annotations?.openWorldHint !== undefined && /habit|calendar|capture|unscheduled|task_schedules/.test(tool.name));
    assert.equal(featureTools.length, 34, 'The release must contain all Habits, Calendar and capture MCP tools.');

    const today = new Date().toISOString().slice(0, 10);
    const habit = await call('reader_create_habit', { habit: { requestKey: randomUUID(), name: 'Packaged MCP reading', description: '', icon: 'book', color: 'green', section: 'Learning', timezone: 'UTC', plan: { startDate: today, endDate: null, frequency: 'DAILY', weekdays: [], intervalDays: 1, weeklyTarget: 3, goalType: 'COUNT', target: 10, unit: 'pages', step: 1, reminders: [] } } });
    await call('reader_record_habit', { habitId: habit.id, date: today, log: { expectedVersion: 0, habitVersion: habit.version, value: 12, status: 'RECORDED', note: 'Transport verified', mood: 4 } });
    assert.equal((await json(`/habits/${habit.id}`)).logs[0].value, 12);
    assert.equal((await call('reader_get_habit_progress', { habitId: habit.id, range: { from: today, to: today } })).stats.completed, 1);

    const event = await call('reader_create_calendar_event', { event: { requestKey: randomUUID(), title: 'Packaged MCP event', description: '', location: '', color: 'blue', timeZone: 'UTC', start: `${today}T15:00`, end: `${today}T16:00`, allDay: false, repeat: null, taskId: null, habitId: null, reminders: [], newTask: { listId: null, priority: 2 } } });
    assert.equal((await json(`/tasks/${event.taskId}`)).dueTime, '15:00');
    await call('reader_save_calendar_occurrence', { eventId: event.id, date: today, occurrence: { eventVersion: event.version, expectedVersion: 0, start: null, end: null, allDay: null, completed: true, cancelled: false } });
    assert.equal((await json(`/tasks/${event.taskId}`)).status, 'done');
    assert.equal((await call('reader_export_calendar_source', { sourceId })).content, sourceContent);

    const input = { captureKey: randomUUID(), title: 'Packaged MCP capture', content: '# Saved through MCP\n\nKeep this.', sourceUrl: 'https://example.com/article?private=value' };
    const capture = await call('reader_create_capture', { capture: input });
    assert.equal((await call('reader_create_capture', { capture: input })).id, capture.id);
    assert.equal((await call('reader_get_capture', { captureId: capture.id })).captureSourceUrl, 'https://example.com/article');
    assert.ok((await json('/reader/captures')).items.some(item => item.id === capture.id));
    const destination = await db.page.create({ data: { userId, title: 'Packaged destination', content: '', sortOrder: 0, childrenCount: 0, createdAt: new Date(), updatedAt: new Date() } });
    await call('reader_keep_capture', { captureId: capture.id, parentPageId: destination.id });
    assert.equal((await call('reader_get_page', { pageId: capture.id })).parentPageId, destination.id);
    assert.equal((await call('reader_list_captures')).items.length, 0);
    const discarded = await call('reader_create_capture', { capture: { ...input, captureKey: randomUUID() } });
    await call('reader_discard_capture', { captureId: discarded.id });
    const missing = await client.callTool({ name: 'reader_get_capture', arguments: { captureId: discarded.id } }, undefined, { timeout: 10000 });
    assert.equal(missing.isError, true);
    console.log('Packaged MCP passed over SSE: authenticated discovery of all 34 tools, habit check-in/progress, task scheduling/completion, original ICS export, and capture create/read/retry/Keep/Discard with HTTP parity.');
  } finally {
    await client.close();
    await transport.close();
  }
}

module.exports = { verifyCalendarRelease };
