import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createDocument } from '@reader/md-ast';
import { MarkdownRenderer } from '@reader/md-view';
import '@reader/md-view/md-view.css';
import { iconPaths } from './icons.js';
import './ui.css';
import './reader-sandbox.css';

const root = createRoot(document.querySelector('#root'));
let channel, connected = false;
const copyRequests = new Map();
function copyText(text) {
    return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID();
        const timeout = setTimeout(() => { copyRequests.delete(requestId); reject(new Error('Copy timed out.')); }, 5000);
        copyRequests.set(requestId, ok => { clearTimeout(timeout); copyRequests.delete(requestId); ok ? resolve() : reject(new Error('Copy failed.')); });
        parent.postMessage({ type: 'reader.copy', channel, requestId, text }, '*');
    });
}
function openLink(href) { parent.postMessage({ type: 'reader.link', channel, href }, '*'); }
function Icon({ name }) { return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(iconPaths[name] || []).map((d, index) => <path key={index} d={d} />)}</svg>; }
function headingDepth(block) { return /^ {0,3}(#{1,6})\s/.exec(block.source)?.[1].length || (/\n {0,3}=+\s*$/.test(block.source) ? 1 : 2); }

function Reader({ payload }) {
    const document = useMemo(() => createDocument(payload.content), [payload.content]);
    const contentRef = useRef(null);
    const [query, setQuery] = useState('');
    const [outline, setOutline] = useState(() => !window.matchMedia('(max-width:700px)').matches);
    const headings = useMemo(() => document.blocks.filter(block => block.kind === 'heading'), [document]);
    const [active, setActive] = useState(headings[0]?.id);
    const [progress, setProgress] = useState(0);
    const toggleRef = useRef(null);
    const closeRef = useRef(null);
    const firstBlock = document.blocks.find(block => !['yaml', 'toml'].includes(block.kind));
    const hasTitle = firstBlock?.kind === 'heading' && headingDepth(firstBlock) === 1;
    const minutes = Math.max(1, Math.ceil(payload.content.split(/\s+/).filter(Boolean).length / 220));
    const filtered = headings.filter(block => block.text.toLowerCase().includes(query.toLowerCase()));
    const closeOutline = () => { setOutline(false); requestAnimationFrame(() => toggleRef.current?.focus()); };
    const showOutline = () => { setOutline(true); requestAnimationFrame(() => closeRef.current?.focus()); };
    useEffect(() => {
        const container = contentRef.current;
        const measure = () => {
            const top = container.getBoundingClientRect().top;
            const nodes = headings.map(block => ({ id:block.id, element:container.querySelector(`[data-md-block-id="${block.id}"]`) })).filter(item => item.element);
            const preceding = nodes.filter(item => item.element.getBoundingClientRect().top <= top + 100);
            setActive(preceding.at(-1)?.id || headings[0]?.id);
            const distance = container.scrollHeight - container.clientHeight;
            setProgress(distance <= 1 ? 100 : Math.min(100, Math.round(container.scrollTop / distance * 100)));
        };
        container.addEventListener('scroll', measure, { passive:true });
        const observer = new ResizeObserver(measure); observer.observe(container); observer.observe(container.querySelector('article'));
        measure();
        return () => { container.removeEventListener('scroll', measure); observer.disconnect(); };
    }, [headings]);
    useEffect(() => {
        const onKey = event => { if (event.key === 'Escape' && outline) closeOutline(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [outline]);
    const jump = id => {
        contentRef.current?.querySelector(`[data-md-block-id="${id}"]`)?.scrollIntoView({ behavior:'smooth', block:'start' });
        setActive(id);
        if (window.matchMedia('(max-width:700px)').matches) closeOutline();
    };
    return <div className={`layout ${outline ? '' : 'focus'}`}>
        {!outline && <button ref={toggleRef} className="outline-toggle" onClick={showOutline} aria-expanded={false} aria-controls="outline"><Icon name="panel" />Contents</button>}
        {outline && <button className="outline-backdrop" aria-label="Close contents" tabIndex={-1} onClick={closeOutline} />}
        {outline && <aside id="outline" aria-label="Table of contents"><div className="outline-header"><div className="outline-heading"><strong>Contents</strong><button ref={closeRef} className="icon-button tooltip-end" onClick={closeOutline} aria-label="Hide contents" data-tooltip="Hide contents"><Icon name="panel" /></button></div><div className="heading-search"><Icon name="search" /><input aria-label="Find a heading" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="icon-button" aria-label="Clear section search" onClick={() => setQuery('')}><Icon name="close" /></button>}</div></div>
            <nav aria-label="Sections">{filtered.map(block => <button key={block.id} className={`depth-${Math.min(4, headingDepth(block))}`} aria-current={active === block.id ? 'location' : undefined} onClick={() => jump(block.id)}>{block.text}</button>)}</nav>
            {!filtered.length && <p className="empty-outline">{query ? 'No matching sections.' : 'This passage is one continuous read.'}</p>}
            <div className="outline-footer"><span>Your progress</span><span>{progress}%</span><progress aria-label="Reading progress" max="100" value={progress} /></div>
        </aside>}
        <main ref={contentRef}><article><div className="article-meta"><Icon name="book" /><span>{minutes} min read</span><span className="meta-dot">·</span><span>Temporary reading</span></div>{!hasTitle && <h1 className="capture-title">{payload.title}</h1>}
            <MarkdownRenderer markdown={payload.content} document={document} baseUrl={payload.sourceUrl || undefined} onCopyText={copyText} onLinkClick={event => { if (event.type !== 'anchor') { event.originalEvent.preventDefault(); openLink(event.href); } }} />
            <footer className="article-end"><span>End of this capture</span><button onClick={() => contentRef.current?.scrollTo({ top:0, behavior:'smooth' })}>Back to top ↑</button></footer>
        </article></main>
    </div>;
}
function appearance(data) {
    document.documentElement.dataset.theme = data.dark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--reading-size', `${Math.min(32, Math.max(14, Number(data.fontSize) || 20))}px`);
    document.documentElement.style.setProperty('--reading-font', data.readingFont === 'merriweather' ? "'Merriweather Variable', Georgia, serif" : "'Lexend Variable', sans-serif");
}
window.addEventListener('message', event => {
    if (event.source !== parent || typeof event.data?.channel !== 'string') return;
    if (event.data.type === 'reader.connect' && (!connected || event.data.channel === channel)) { parent.postMessage({ type:'reader.ready' }, '*'); return; }
    if (!connected && event.data.type === 'reader.render') { channel = event.data.channel; connected = true; }
    if (event.data.channel !== channel) return;
    if (event.data.type === 'reader.copied') { copyRequests.get(event.data.requestId)?.(event.data.ok === true); return; }
    if (event.data.type === 'reader.appearance') { appearance(event.data); return; }
    if (event.data.type === 'reader.render' && typeof event.data.payload?.content === 'string' && event.data.payload.content.length <= 512 * 1024) {
        appearance(event.data); root.render(<Reader payload={event.data.payload} />);
    }
});
parent.postMessage({ type:'reader.ready' }, '*');
