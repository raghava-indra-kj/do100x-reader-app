import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import { readerPageWithIdRouteValue } from '@boot/routes';
import type { Page } from '@domain/page/models/page';
import type { PageNavigation } from '@domain/page/models/page-navigation';
import { getPageNavigation, queryPages } from '@domain/page/services/pages-service';
import { ReaderActionButton } from './reader-action-button';

type Node = { id: string; title: string; childrenCount?: number };
type TreeContext = { currentId: string; branches: Map<string, Node[]>; onNavigate: () => void };

function PageBranch({ node, parents, branches, currentId, onNavigate }: TreeContext & { node: Node; parents: string[] }) {
    const initial = branches.get(node.id);
    const [expanded, setExpanded] = useState(Boolean(initial?.length));
    const [loaded, setLoaded] = useState<Node[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const groupId = useId();
    const current = node.id === currentId;
    const children = (initial ?? loaded)?.filter(child => child.id !== node.id && !parents.includes(child.id));
    const expandable = children ? children.length > 0 : Boolean(node.childrenCount);
    const toggle = (expanded ? 'Collapse ' : 'Expand ') + node.title;
    useEffect(() => {
        if (!expanded || initial || loaded) return;
        const abort = new AbortController();
        void queryPages({ parentPageId: node.id, signal: abort.signal }).then(result => {
            if (abort.signal.aborted) return;
            if (result.ok) setLoaded(result.data);
            else setFailed(true);
        });
        return () => abort.abort();
    }, [node.id, expanded, initial, loaded, attempt]);
    return <li>
        <div className="reader-tree-row" data-current={current || undefined} style={{ paddingInlineStart: Math.min(parents.length, 7) * 11 }}>
            {expandable ? <ReaderActionButton tooltip={toggle} aria-expanded={expanded} aria-controls={expanded ? groupId : undefined}
                className="reader-tree-toggle" onClick={() => { setFailed(false); setExpanded(!expanded); }}>
                <ChevronRight size={14} aria-hidden="true" />
            </ReaderActionButton> : <span className="reader-tree-spacer" />}
            {current ? <span className="reader-tree-page" aria-current="page"><FileText size={15} aria-hidden="true" />{node.title}</span>
                : <Link className="reader-tree-page" to={readerPageWithIdRouteValue(node.id)} onClick={onNavigate}>
                    {expandable ? <Folder size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}{node.title}
                </Link>}
        </div>
        {expandable && expanded && <ul id={groupId}>
            {children ? children.map(child => <PageBranch key={child.id} node={child} parents={[...parents, node.id]}
                branches={branches} currentId={currentId} onNavigate={onNavigate} />)
                : <li className="reader-tree-status" role="status">{failed ? <>Couldn’t load subpages.
                    <button onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>Retry</button></> : 'Loading subpages…'}</li>}
        </ul>}
    </li>;
}

export function PageTree({ page, onNavigate }: { page: Page; onNavigate: () => void }) {
    const [data, setData] = useState<PageNavigation | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const list = useRef<HTMLUListElement>(null);
    useEffect(() => {
        if (page.captureExpiresAt) return;
        const abort = new AbortController();
        void getPageNavigation(page.id, abort.signal).then(result => {
            if (abort.signal.aborted) return;
            if (result.ok) setData(result.data);
            else setFailed(true);
        });
        return () => abort.abort();
    }, [page.id, page.captureExpiresAt, attempt]);
    const tree = useMemo(() => {
        const path = data?.path ?? [...page.ancestors, page];
        const branches = new Map<string, Node[]>(path.map(label => [label.id, []]));
        if (data) {
            for (const child of data.children) branches.get(child.parentPageId)?.push(child);
        }
        // Keep the known route reachable even if a page moved while the tree was loading.
        for (let i = 1; i < path.length; i++) {
            const siblings = branches.get(path[i - 1].id)!;
            if (!siblings.some(item => item.id === path[i].id)) siblings.push(path[i]);
        }
        return { root: path[0], branches };
    }, [data, page]);
    useEffect(() => {
        if (data) list.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' });
    }, [data]);
    return <>
        {page.captureExpiresAt && <Link className="reader-tree-page" to="/reader/captures" onClick={onNavigate}><Folder size={15} />Temporary inbox</Link>}
        {failed && !page.ancestors.length && page.parentPageId && page.isOwner && <Link className="reader-tree-page"
            to={readerPageWithIdRouteValue(page.parentPageId)} onClick={onNavigate}>Go to parent</Link>}
        <ul ref={list} aria-label="Pages">
            <PageBranch key={data ? 'ready' : 'initial'} node={tree.root} parents={[]} branches={tree.branches} currentId={page.id} onNavigate={onNavigate} />
        </ul>
        {!data && !page.captureExpiresAt && <div className="reader-tree-status" role="status">
            {failed ? <>Couldn’t load the page tree. <button onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>Retry</button></> : 'Loading pages…'}
        </div>}
    </>;
}
