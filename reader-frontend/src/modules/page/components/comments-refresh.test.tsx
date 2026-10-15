// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { observable, runInAction } from 'mobx';
import { afterEach, expect, it, vi } from 'vitest';
import { Comment } from '@domain/comment/models/comment';

const fixture = vi.hoisted(() => ({ store: null as any, getComments: vi.fn() }));
vi.mock('../store', () => ({ usePageStore: () => fixture.store }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ isAuthenticated: true }) }));
vi.mock('@domain/comment/services/comments-service', () => ({ getComments: fixture.getComments, editComment: vi.fn(), deleteComment: vi.fn(), deleteAllComments: vi.fn() }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: any) => children }));
vi.mock('@modules/core/ui/components/confirmation-dialog', () => ({ ConfirmationDialog: () => null }));
import { PageComments } from './comments-panel';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ''; fixture.getComments.mockReset(); });
function note(status: 'attached' | 'source-removed', revision: number) {
    return new Comment({ id:'comment', pageId:'page', pageTitle:'Page', sectionTitle:null, selectedText:'Original passage', body:'My note', linkedPageId:null, isExplanation:false, createdAt:new Date(), updatedAt:new Date(), anchorRevision:revision, anchor:{ version:1, kind:'text', quote:'Original passage', status, segments: status === 'attached' ? [{ blockId:'b', start:0, end:16 }] : [] } });
}
it('refreshes attachment state after a content edit and ignores a slower old response', async () => {
    fixture.store = observable({ pageId:'page', commentsVersion:0, optCurrentPage:{ contentVersion:1 }, bumpCommentsVersion:vi.fn() });
    let finishOld!: (value: unknown) => void;
    fixture.getComments.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(<MemoryRouter><PageComments /></MemoryRouter>));
    fixture.getComments.mockResolvedValueOnce({ ok:true, data:[note('source-removed', 2)] });
    await act(async () => runInAction(() => { fixture.store.optCurrentPage.contentVersion = 2; }));
    expect(fixture.getComments).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('No active comments');
    await act(async () => finishOld({ ok:true, data:[note('attached', 1)] }));
    expect(host.textContent).toContain('No active comments');
    const history = [...host.querySelectorAll('button')].find(button => button.textContent === 'History')!;
    await act(async () => history.click());
    expect(host.textContent).toContain('Source removed');
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Expand all comments"]')!.click());
    expect(host.textContent).toContain('Original passage');
});
