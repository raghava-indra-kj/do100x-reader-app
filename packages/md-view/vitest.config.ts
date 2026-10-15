import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@reader/md-ast': fileURLToPath(new URL('../md-ast/src/index.ts', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
});
