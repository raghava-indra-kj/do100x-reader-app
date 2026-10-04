'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'reader-backend');
const applicationKeys = ['NODE_ENV', 'DATABASE_URL', 'GOOGLE_CLIENT_ID', 'APP_ORIGINS', 'SESSION_SECRET', 'PORT'];

function requireNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) throw new Error('Node.js 22.12 or newer is required.');
}

function readProfile(profile) {
  requireNode();
  if (!['development', 'production'].includes(profile)) throw new Error('Unknown configuration profile.');
  const file = path.join(backend, profile === 'production' ? '.env.prod' : '.env');
  let raw, values;
  try { raw = fs.readFileSync(file, 'utf8'); values = parseEnv(raw); }
  catch { throw new Error(`Create reader-backend/${path.basename(file)} using its example file before continuing.`); }
  const required = applicationKeys.filter(key => key !== 'PORT');
  const missing = required.filter(key => !values[key]?.trim());
  if (missing.length) throw new Error(`${path.basename(file)} is missing: ${missing.join(', ')}.`);
  if (values.NODE_ENV !== profile) throw new Error(`${path.basename(file)} must set NODE_ENV=${profile}.`);
  if (values.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(values.GOOGLE_CLIENT_ID) || values.GOOGLE_CLIENT_ID.startsWith('your-')) {
    throw new Error('GOOGLE_CLIENT_ID must be your real Google Web application client ID.');
  }
  try {
    const url = new URL(values.DATABASE_URL);
    if (url.protocol !== 'mysql:' || !url.hostname || !url.username || url.pathname.length <= 1 ||
        /DB_USERNAME|URL_ENCODED_PASSWORD|DB_HOST|DB_NAME|CONFIRM_ME/i.test(values.DATABASE_URL)) throw new Error();
    decodeURIComponent(url.username); decodeURIComponent(url.password);
  } catch { throw new Error('DATABASE_URL must contain a real MySQL host, username and database, with URL-encoded credentials.'); }
  try {
    for (const origin of values.APP_ORIGINS.split(',').map(value => value.trim())) {
      const url = new URL(origin);
      if (url.origin !== origin || url.username || url.password || url.hostname.includes('*') ||
          !['http:', 'https:'].includes(url.protocol) || (profile === 'production' && url.protocol !== 'https:')) throw new Error();
    }
  } catch { throw new Error('APP_ORIGINS must contain exact origins without paths; production origins must use HTTPS.'); }
  validatePort(values.PORT || '3000');
  return { file, values, raw };
}

function validatePort(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) throw new Error('PORT must be a number between 1 and 65535.');
  return value;
}

function profileEnvironment(profile, { hostingPort = false } = {}) {
  const { file, values } = readProfile(profile);
  const env = { ...process.env };
  for (const key of applicationKeys) {
    if (values[key] !== undefined) env[key] = values[key];
    else delete env[key];
  }
  env.PORT = validatePort((hostingPort && process.env.PORT) || values.PORT || '3000');
  // dotenv/config must not read an unrelated .env when the production app starts.
  env.DOTENV_CONFIG_PATH = file;
  env.DOTENV_CONFIG_OVERRIDE = 'false';
  return env;
}

module.exports = { root, backend, requireNode, readProfile, profileEnvironment };
