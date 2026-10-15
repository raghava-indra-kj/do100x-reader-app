import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
// NodeNext consumers need explicit extensions in declarations too.
const root = path.resolve(process.argv[2]);
async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) await walk(file);
    else if (item.name.endsWith('.d.ts')) {
      const source = await readFile(file, 'utf8');
      await writeFile(file, source.replace(/(from\s+|import\s*\(|import\s+)(["'])(\.{1,2}\/[^"']+)\2/g, (match, before, quote, specifier) => {
        if (/\.[cm]?js$/.test(specifier)) return match;
        const target = path.resolve(path.dirname(file), specifier);
        const suffix = existsSync(`${target}.d.ts`) ? '.js' : existsSync(path.join(target, 'index.d.ts')) ? '/index.js' : undefined;
        if (!suffix) throw new Error(`Unresolved declaration import ${specifier} in ${file}`);
        return `${before}${quote}${specifier}${suffix}${quote}`;
      }));
    }
  }
}
await walk(root);
