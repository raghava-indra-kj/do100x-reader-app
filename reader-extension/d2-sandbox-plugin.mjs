import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** @d2lang/d2 0.1.33 embeds a self-contained worker but marks it as a module.
 * Chromium rejects a module blob worker in an opaque sandbox (cross-origin
 * top-level worker redirect). Its worker exports are unused. Package the
 * same worker as classic JS here, leaving Reader/web consumers unchanged.
 * Fail closed if the pinned upstream source shape changes. */
export function classicD2Worker(source) {
    const exported = 'export function setupMessageHandler(isNode, port, initWasm) {';
    const decoder = 'export let BrotliDecode = (() => {';
    const factory = /new Worker\((URL\.createObjectURL\([a-zA-Z_$][\w$]*\)),\{type:"module"\}\)/g;
    if (source.split(exported).length !== 2 || source.split(decoder).length !== 2 || [...source.matchAll(factory)].length !== 1) throw new Error('D2 worker format changed. Review the sandbox adapter before building.');
    return source.replace(exported, 'function setupMessageHandler(isNode, port, initWasm) {').replace(decoder, 'let BrotliDecode = (() => {').replace(factory, 'new Worker($1)');
}
export const d2SandboxPlugin = {
    name:'d2-opaque-sandbox-worker',
    setup(build) {
        build.onLoad({ filter:/[\\/]@d2lang[\\/]d2[\\/]dist[\\/]browser[\\/]index\.js$/ }, async ({ path: sourcePath }) => {
            const contents = classicD2Worker(await readFile(sourcePath,'utf8'));
            // Distribute the modified dependency source alongside the extension.
            const sourceDir = path.join(path.dirname(build.initialOptions.outfile), 'sources');
            await mkdir(sourceDir, { recursive:true });
            await writeFile(path.join(sourceDir, 'd2-browser.js'), contents);
            await writeFile(path.join(sourceDir, 'D2-NOTICE.txt'), 'D2.js 0.1.33 — MPL-2.0\nhttps://www.npmjs.com/package/@d2lang/d2/v/0.1.33\nUpstream source: https://github.com/d2lang/d2/tree/master/d2js/js\nLicense: https://www.mozilla.org/MPL/2.0/\n\nThe accompanying d2-browser.js contains the bundled dependency source with three changes: the two exports inside the worker string are removed, and the worker is created as a classic worker. The public D2 API is unchanged. This adapter is used only by the isolated extension sandbox.\n');
            return { contents, loader:'js' };
        });
    },
};
