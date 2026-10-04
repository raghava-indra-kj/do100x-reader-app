'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { root, backend, profileEnvironment } = require('./environment.cjs');
const { runNpm, runPrisma } = require('./commands.cjs');

try {
  const env = profileEnvironment('production', { hostingPort: true });
  for (const file of ['reader-backend/dist/index.js', 'reader-frontend/dist/index.html', 'package-lock.json']) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}. Upload the ZIP produced by npm run package.`);
  }
  // The secret file is never served by Express; also restrict local file access.
  fs.chmodSync(path.join(backend, '.env.prod'), 0o600);
  console.log('Installing locked backend runtime dependencies…');
  runNpm(['ci', '--omit=dev', '--workspace=reader-backend', '--include-workspace-root=false', '--no-audit', '--no-fund'], env);
  console.log('Generating Prisma client for this server…');
  runPrisma(['generate'], env);
  console.log('Applying pending production migrations (no reset or seeding)…');
  runPrisma(['migrate', 'deploy'], env);
} catch (error) { console.error(`Startup stopped: ${error.message}`); process.exit(1); }
