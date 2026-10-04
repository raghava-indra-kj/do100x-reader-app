import { describe, expect, it } from 'vitest';
import { activeSuiteApp, suiteApps } from './app-catalog';

describe('do100x app catalog', () => {
    it('exposes exactly the three existing apps with unique local destinations', () => {
        expect(suiteApps.map(app => [app.name, app.route])).toEqual([['Reader', '/reader'], ['Finance', '/finance'], ['Tasks', '/tasks']]);
        expect(new Set(suiteApps.map(app => app.id)).size).toBe(3);
    });
    it('uses one practical description per app without duplicate marketing fields', () => {
        expect(suiteApps.map(app => app.description)).toEqual([
            'Read and organize your pages.',
            'Track spending and upcoming bills.',
            'Plan tasks and track your time.',
        ]);
        for (const app of suiteApps) {
            expect(app).not.toHaveProperty('tagline');
            expect(app).not.toHaveProperty('detail');
        }
    });
    it.each([['/reader', 'reader'], ['/reader/pages/a', 'reader'], ['/finance', 'finance'], ['/tasks', 'tasks']])('identifies the current workspace %s', (path, id) => {
        expect(activeSuiteApp(path)?.id).toBe(id);
    });
    it.each(['/', '/login', '/settings', '/pages/a', '/reader-other', '/finance-other', '/tasks-other'])('does not match unrelated routes: %s', path => {
        expect(activeSuiteApp(path)).toBeUndefined();
    });
});
