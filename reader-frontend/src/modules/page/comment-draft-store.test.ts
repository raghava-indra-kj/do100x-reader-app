import { describe, expect, it } from 'vitest';
import { createDocument, createTextAnchor } from '@reader/md-ast';
import { CommentDraftStore } from './comment-draft-store';

const document = createDocument('same same');
const context = (start = 0, pageId = 'page') => ({ pageId, pageTitle: 'Title', sectionId: 'section', sectionTitle: 'Section', selectedText: 'same', target: { anchor: createTextAnchor(document, { start, end: start + 4 }), contentVersion: 7, document, blockIds: [] } });

describe('page-scoped comment drafts', () => {
    it('never combines identical quotations with different anchors and excludes other pages', () => {
        const store = new CommentDraftStore();
        const a = store.begin(context()); store.update(a, { body: 'First' }); store.park(a);
        const b = store.begin(context(5)); store.update(b, { body: 'Second' }); store.park(b);
        expect(store.recoverable('page').map(draft => draft.target.anchor!.segments[0].start)).toEqual([0, 5]);
        expect(store.recoverable('other')).toEqual([]);
        expect(new CommentDraftStore().recoverable('page')).toEqual([]);
    });
    it('binds save completion to the submitted draft revision without replacing newer input', () => {
        const store = new CommentDraftStore(); const id = store.begin(context());
        store.update(id, { body: 'Submitted' }); const submitted = store.submit(id)!;
        store.update(id, { body: 'Still writing' }); store.complete(submitted);
        expect(submitted.draft.body).toBe('Submitted');
        expect(store.get(id)?.body).toBe('Still writing');
        expect(store.recoverable('page')).toHaveLength(1);
        const newer = store.submit(id)!; store.complete(newer);
        expect(store.recoverable('page')).toEqual([]);
    });
    it('keeps failures and rejects duplicate submits; discarding does not resurrect a completed request', () => {
        const store = new CommentDraftStore(); const id = store.begin(context());
        store.update(id, { body: 'Keep me' }); const submission = store.submit(id)!;
        expect(store.submit(id)).toBeNull(); store.park(id);
        store.complete(submission, 'Could not save');
        expect(store.get(id)?.error).toBe('Could not save');
        const retry = store.submit(id)!; store.discard(id); store.complete(retry);
        expect(store.drafts).toEqual([]);
    });
    it('drops blank or already saved parked entries without discarding unsaved explanations', () => {
        const store = new CommentDraftStore(); const blank = store.begin(context()); store.park(blank);
        expect(store.drafts).toEqual([]);
        const id = store.begin(context()); store.update(id, { body: 'Note', isExplanation: true, pageNote: true }); store.park(id);
        expect(store.get(id)).toMatchObject({ isExplanation: true, pageNote: true, target: { contentVersion: 7 } });
        store.complete(store.submit(id)!); store.park(id);
        expect(store.drafts).toEqual([]);
    });
});
