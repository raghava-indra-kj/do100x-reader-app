// Separate opt-in test runner. Never bundled or mounted by the production app.
const path = require('node:path');
const { build } = require('esbuild');
const { dependencies } = require('../package.json');
if (process.env.RUN_FINANCE_BROWSER_QA !== '1' || process.env.NODE_ENV === 'production') throw new Error('Explicit non-production Finance QA opt-in required');
build({ entryPoints: [path.resolve(__dirname, '../src/finance/browser-qa.ts')], outfile: path.resolve(__dirname, '../dist/finance-browser-qa.js'), bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: Object.keys(dependencies).filter(name => name !== '@reader/finance-core') }).then(() => require('../dist/finance-browser-qa.js')).catch(error => { console.error(error); process.exitCode = 1; });
