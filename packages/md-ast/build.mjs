import { build } from 'esbuild';
await build({ entryPoints: ['src/index.ts'], outfile: 'dist/index.js', bundle: true, packages: 'external', format: 'esm', platform: 'neutral', target: 'es2022', sourcemap: true });
