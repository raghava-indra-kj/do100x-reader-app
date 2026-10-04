'use strict';

const { profileEnvironment } = require('./environment.cjs');
try { Object.assign(process.env, profileEnvironment('production', { hostingPort: true })); }
catch (error) { console.error(`Production configuration: ${error.message}`); process.exit(1); }
