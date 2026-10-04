#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v node >/dev/null 2>&1 || { echo "Node.js 22.12 or newer is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 1; }

node "$SCRIPT_DIR/scripts/prepare-hosting.cjs"
echo "Starting do100x…"
cd "$SCRIPT_DIR/reader-backend"
# Replace Bash with Node so hosting shutdown signals reach the application.
exec node --require "$SCRIPT_DIR/scripts/production-env.cjs" dist/index.js
