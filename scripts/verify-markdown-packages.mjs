import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (!npmCli || !existsSync(npmCli)) throw new Error('Run this verifier through npm run verify:markdown.');
const npm = (args, cwd = root, capture = false) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', windowsHide: true });
const node = (args, cwd) => execFileSync(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
npm(['run', 'build:markdown']);
mkdirSync(path.join(root, 'releases'), { recursive: true });
const reports = [];
for (const major of [18, 19]) {
// Outside the monorepo so undeclared dependencies cannot resolve from its node_modules.
const consumer = mkdtempSync(path.join(tmpdir(), `reader-md-react${major}-`));
const tarballs = {};
for (const name of ['md-ast', 'md-view']) {
  const result = JSON.parse(npm(['pack', '--workspace', `@reader/${name}`, '--ignore-scripts', '--json', '--pack-destination', consumer], root, true));
  tarballs[`@reader/${name}`] = `file:./${result[0].filename}`;
}
writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({
  name: 'markdown-independent-consumer', private: true, type: 'module',
  dependencies: { ...tarballs, react: major === 18 ? '^18.3.1' : '^19.2.7', 'react-dom': major === 18 ? '^18.3.1' : '^19.2.7' },
  devDependencies: { typescript: '^6.0.3', '@types/react': major === 18 ? '^18.3.0' : '^19.2.17', '@types/react-dom': major === 18 ? '^18.3.0' : '^19.2.3', esbuild: '0.28.2' },
}, null, 2));
npm(['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
writeFileSync(path.join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
  target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', jsx: 'react-jsx',
  strict: true, noEmit: true, skipLibCheck: false, types: ['react', 'react-dom'],
}, include: ['app.tsx', 'styles.d.ts'] }, null, 2));
writeFileSync(path.join(consumer, 'styles.d.ts'), "declare module '*.css';\n");
const markdown = '# Standalone Markdown\n\nA **reusable** viewer, with $E = mc^2$ and [source links][docs].\n\n## Mathematics\n\n$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$\n\n## Code\n\n```typescript\nconst answer: number = 42;\n```\n\n## D2\n\n```d2\nReader -> Core -> Viewer\n```\n\n```d2\nCapture -> Read -> Learn\n```\n\n## Mermaid\n\n```mermaid\ngraph LR\n  A[Source] --> B[Render]\n```\n\n## Components\n\n```reader-component\n{"type":"quiz","id":"example-quiz"}\n```\n\n[docs]: https://example.com/docs\n';
writeFileSync(path.join(consumer, 'app.tsx'), `import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { MarkdownRenderer, selectionToAnchor, anchorToRanges } from '@reader/md-view';
import { createDocument, createTextAnchor, editAnnotatedDocument, moveAnnotatedBlocks, copyAnnotatedBlocks, createAnnotationChange, restoreAnnotationChange, type AnnotationAnchor } from '@reader/md-ast';
import '@reader/md-view/md-view.css';
const source = ${JSON.stringify(markdown)};
const document = createDocument(source);
const anchor: AnnotationAnchor = createTextAnchor(document, { start: 2, end: 12 });
editAnnotatedDocument(document, [], [anchor]);
moveAnnotatedBlocks(document, [document.blocks[0].id], null, [anchor]);
copyAnnotatedBlocks(document, [document.blocks[0].id], null, [anchor]);
const state = { document, annotations: [{ id: 'sample', anchor }] };
restoreAnnotationChange(state, createAnnotationChange(state, state), 'undo');
function App() {
  const [model, setModel] = useState(document);
  const [comment, setComment] = useState<AnnotationAnchor | null>(null);
  const [message, setMessage] = useState('Select a passage to test its source attachment.');
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = content.current?.querySelector<HTMLElement>('.md-view');
    if (root && CSS.highlights) {
      CSS.highlights.set('sample-comment', new Highlight(...(comment ? anchorToRanges(root, model, comment) : [])));
      return () => { CSS.highlights.delete('sample-comment'); };
    }
  }, [comment, model]);
  const capture = () => {
    const selected = window.getSelection(), root = content.current?.querySelector<HTMLElement>('.md-view');
    if (!root || !selected?.rangeCount || selected.isCollapsed) return;
    const result = selectionToAnchor(root, model, selected.getRangeAt(0));
    if (result.status === 'attached') { setComment(result.anchor); setMessage(result.anchor.status + ': ' + result.anchor.quote); }
    else setMessage('Selection: ' + result.status);
  };
  const insert = () => {
    const result = editAnnotatedDocument(model, [{ start: 0, end: 0, expected: '', insert: 'An introduction added after commenting.\\n\\n' }], comment ? [comment] : []);
    setModel(result.document); setComment(result.anchors[0] ?? null);
    setMessage(result.anchors[0] ? result.anchors[0].status + ': ' + result.anchors[0].quote : 'Introduction inserted.');
  };
  return <><header className="verification-controls"><strong>Standalone package verification</strong><p><output aria-live="polite">{message}</output></p><button onClick={insert}>Insert text before selection</button><button onClick={() => { setComment(null); setMessage('Select a passage to test its source attachment.'); }}>Clear annotation</button></header><div ref={content} onMouseUp={capture} onKeyUp={capture}><MarkdownRenderer markdown={model.source} document={model} embeds={{ quiz: ({ value }) => <aside className="quiz">Embedded quiz: {value.id}</aside> }} /></div></>;
}
createRoot(window.document.getElementById('app')!).render(<App />);
`);
writeFileSync(path.join(consumer, 'smoke.mjs'), `import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDocument, hydrateDocument, serializeDocument, createTextAnchor, editAnnotatedDocument, replaceAnnotatedSource, moveAnnotatedBlocks, copyAnnotatedBlocks, createAnnotationChange, restoreAnnotationChange } from '@reader/md-ast';
import { MarkdownRenderer } from '@reader/md-view';
const source = ${JSON.stringify(markdown)};
const document = createDocument(source);
assert.equal(serializeDocument(hydrateDocument(JSON.parse(JSON.stringify(document)))), source);
const target = createTextAnchor(document, { start: 2, end: 12 });
const next = editAnnotatedDocument(document, [{ start: 0, end: 0, expected: '', insert: 'Introduction\\n\\n' }], [target]);
assert.equal(next.anchors[0].status, 'attached');
assert.equal(replaceAnnotatedSource(document, source.replace('reusable', 'portable'), [target]).anchors[0].status, 'attached');
const moved = moveAnnotatedBlocks(document, [document.blocks[0].id], null, [target]);
assert.equal(moved.document.blocks.at(-1).id, document.blocks[0].id);
assert.deepEqual(moved.anchors[0], target);
const copied = copyAnnotatedBlocks(document, [document.blocks[0].id], null, [target]);
assert.notEqual(copied.document.blocks.at(-1).id, document.blocks[0].id);
const before = { document, annotations: [{ id: 'note', anchor: target }] };
const after = { document: moved.document, annotations: [{ id: 'note', anchor: moved.anchors[0] }] };
assert.deepEqual(restoreAnnotationChange(after, createAnnotationChange(before, after), 'undo').state, before);
const html = renderToStaticMarkup(React.createElement(MarkdownRenderer, { markdown: source, document }));
assert.match(html, /katex-mathml/); assert.match(html, /hljs-keyword/); assert.match(html, /data-md-block-id/); assert.match(html, /data-md-text-map/); assert.match(html, /data-md-atomic-kind="math"/);
const cssPath = new URL('./node_modules/@reader/md-view/dist/math.css', import.meta.url);
const css = readFileSync(cssPath, 'utf8');
assert.match(css, /KaTeX_Main-Regular/);
assert(existsSync(new URL('./fonts/KaTeX_Main-Regular.woff2', cssPath)));
console.log('Independent ESM import, SSR, source preservation, annotation edits/history, block operations and font assets passed.');
`);
writeFileSync(path.join(consumer, 'build.mjs'), `import { build } from 'esbuild';
await build({ entryPoints: { app: 'app.tsx' }, outdir: 'dist', bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', loader: { '.woff2': 'file', '.woff': 'file', '.ttf': 'file' }, define: { 'process.env.NODE_ENV': '"production"' } });
`);
node(['smoke.mjs'], consumer);
node(['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json'], consumer);
node(['build.mjs'], consumer);
writeFileSync(path.join(consumer, 'dist/index.html'), '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Standalone Markdown verification</title><link rel="stylesheet" href="./app.css"><style>body{margin:0;background:#fff;color:#243044;font:17px/1.6 system-ui,sans-serif}#app{max-width:900px;margin:40px auto;padding:0 24px}.quiz,.verification-controls{border:1px solid #dce1e8;border-radius:8px;padding:18px;background:#f6f8fa}.verification-controls{margin-bottom:24px;font-size:14px}.verification-controls button{font:inherit;padding:8px 12px;margin-right:8px;background:white;border:1px solid #b4bfce;border-radius:5px;cursor:pointer}::highlight(sample-comment){background:#ffe3a3;color:#1b293d}</style></head><body><main id="app"></main><script type="module" src="./app.js"></script></body></html>');
reports.push({ react: major, consumer, packages: tarballs });
console.log(`Independent React ${major} package verification passed. Browser fixture: ${path.join(consumer, 'dist')}`);
}
writeFileSync(path.join(root, 'releases/markdown-package-verification.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), consumer: reports.at(-1).consumer, consumers: reports, checks: ['ESM import', 'SSR', 'source preservation', 'annotation edit', 'whole-source edit', 'block move/copy', 'annotation history', 'font assets', 'NodeNext types', 'browser bundle'] }, null, 2));
