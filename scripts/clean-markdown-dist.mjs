import { existsSync, lstatSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(process.cwd());
const allowed = ['md-ast', 'md-view'].map(name => path.join(workspace, 'packages', name));
if (!allowed.includes(directory)) throw new Error('Run the Markdown build from its package directory.');
const output = path.resolve(directory, 'dist');
if (path.dirname(output) !== directory) throw new Error('Unexpected build output path.');
if (existsSync(output)) {
  if (lstatSync(output).isSymbolicLink() || path.dirname(realpathSync(output)) !== realpathSync(directory)) throw new Error('Refusing to remove redirected build output.');
  rmSync(output, { recursive: true });
}
