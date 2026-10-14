import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Copy, List, LocateFixed, Pencil, Search, X } from 'lucide-react';
import { usePageStore } from '../store';
import { PageHeadingLevel } from '../theme/page-heading-level';
import { buildOutline, compactOutline, filterOutline, outlineAncestors, outlineBranches, type OutlineNode } from '../toc-outline';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { UpsertPageDialog } from './upsert-page';
import './reader-experience.css';

export const PageToc = observer(function PageToc() {
    const store = usePageStore();
    const page = store.optCurrentPage;
    const active = store.currentSection;
    const maxLevel = store.headingLevel.value ?? 6;
    const [editOpen, setEditOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const activeRef = useRef<HTMLButtonElement>(null);
    const outline = useMemo(() => compactOutline(buildOutline(page?.sections ?? [], maxLevel), page?.title ?? ''), [page, maxLevel]);
    const filtered = useMemo(() => filterOutline(outline, query), [outline, query]);
    const path = useMemo(() => outlineAncestors(outline, active?.id ?? ''), [outline, active?.id]);
    const branches = useMemo(() => outlineBranches(outline), [outline]);
    const previousOutline = useRef<OutlineNode[] | null>(null);
    useEffect(() => {
        const reset = previousOutline.current !== outline;
        previousOutline.current = outline;
        setCollapsed(previous => new Set((reset ? branches : [...previous]).filter(id => !path.includes(id))));
    }, [path, outline, branches]);
    useEffect(() => {
        const frame = requestAnimationFrame(() => activeRef.current?.scrollIntoView({ block: 'nearest' }));
        return () => cancelAnimationFrame(frame);
    }, [active?.id, outline, query]);
    const revealCurrent = () => {
        setQuery('');
        setCollapsed(previous => new Set([...previous].filter(id => !path.includes(id))));
        requestAnimationFrame(() => activeRef.current?.scrollIntoView({ block: 'nearest' }));
    };
    const toggle = (id: string) => setCollapsed(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const renderNodes = (nodes: OutlineNode[], depth = 0) => <ul className="reader-outline-list">
        {nodes.map(({ section, children, label }) => {
            const isActive = active?.id === section.id;
            const open = Boolean(query.trim()) || !collapsed.has(section.id);
            const title = label ?? section.title ?? section.rawTitle ?? 'Introduction';
            return <li key={section.id}>
                <div className={`reader-outline-row ${isActive ? 'is-active' : ''} ${path.includes(section.id) && !isActive ? 'is-ancestor' : ''}`} style={{ paddingLeft: `${Math.min(depth, 5) * 12 + 6}px` }}>
                    {children.length ? <button type="button" className="reader-outline-toggle" aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} aria-expanded={open} onClick={() => toggle(section.id)} disabled={Boolean(query.trim())}>
                        <ChevronRight size={14} aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined }} />
                    </button> : <span className="reader-outline-leaf" aria-hidden="true">·</span>}
                    <button type="button" ref={isActive ? activeRef : undefined} className="reader-outline-link" aria-current={isActive ? 'location' : undefined} title={title} onClick={() => {
                        store.setCurrentSection(section);
                        if (window.matchMedia('(max-width: 700px)').matches) store.uiSettingsStore.setSidebarPanelOpen(false);
                    }}>{title}</button>
                </div>
                {children.length > 0 && open && renderNodes(children, depth + 1)}
            </li>;
        })}
    </ul>;
    if (!page) return <div className="reader-outline-empty" role="status">Loading contents…</div>;
    const index = active ? store.navigableSections.indexOf(active) + 1 : 0;
    return <div className="reader-outline">
        <header className="reader-outline-header">
            <div className="reader-outline-heading"><h2>Contents <span>{store.navigableSections.length}</span></h2>
                {store.isOwner && <button type="button" className="reader-icon-button" onClick={() => setEditOpen(true)} aria-label="Edit page" title="Edit page"><Pencil size={14} /></button>}
            </div>
            {outline.length > 0 && <>
                <div className="reader-outline-search"><Search size={14} aria-hidden="true" /><input aria-label="Find a section" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" className="reader-icon-button" onClick={() => setQuery('')} aria-label="Clear section search"><X size={13} /></button>}</div>
                <div className="reader-outline-controls"><label>Show <select aria-label="Contents heading depth" value={store.headingLevel.id} onChange={event => { const level = PageHeadingLevel.VALUES.find(item => item.id === event.target.value); if (level) store.setHeadingLevel(level); }}>
                    {PageHeadingLevel.VALUES.filter(level => level.value && store.flatSections.some(section => section.level === level.value)).map(level => <option key={level.id} value={level.id}>Through {level.label}</option>)}
                </select></label>
                {branches.length > 0 && <button type="button" disabled={Boolean(query.trim())} onClick={() => setCollapsed(collapsed.size ? new Set() : new Set(branches))}>{collapsed.size ? 'Expand all' : 'Collapse all'}</button>}</div>
            </>}
        </header>
        <nav className="reader-outline-scroll" aria-label="Table of contents">
            {filtered.length ? renderNodes(filtered) : <div className="reader-outline-empty"><List size={22} aria-hidden="true" /><p>{query ? 'No matching sections.' : page.isEmpty ? 'Add content to start reading.' : 'Headings will appear here.'}</p>{query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}</div>}
        </nav>
        {active && <footer className="reader-outline-footer"><div><span>Section {index} of {store.navigableSections.length}</span><div className="reader-outline-footer-actions"><button type="button" className="reader-icon-button" onClick={revealCurrent} aria-label="Show current section in contents" title="Show current section"><LocateFixed size={15} /></button><button type="button" className="reader-icon-button" aria-label="Copy current section" title="Copy current section" onClick={() => { void navigator.clipboard.writeText(active.fullMarkdown).then(() => toast.success('Section copied'), () => toast.error('Couldn’t copy this section.')); }}><Copy size={14} /></button></div></div><progress max={store.navigableSections.length} value={index} aria-label="Section position" /></footer>}
        {store.isOwner && <UpsertPageDialog open={editOpen} onOpenChange={setEditOpen} parentPageId={page.parentPageId} editPageId={page.id} initialTitle={page.title} initialContent={page.content} initialCategory={page.category} />}
    </div>;
});
