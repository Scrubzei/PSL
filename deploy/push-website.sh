#!/bin/bash
set -e

SERVER="slb"
REMOTE_PATH="/var/www/slb"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Building website ==="
cd "$REPO_ROOT/services/website"
npm install
npm run build

echo "=== Pushing website to $SERVER ==="
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  "$REPO_ROOT/services/website/dist/" \
  $SERVER:$REMOTE_PATH/services/website/dist/

echo "=== Done ==="
echo "Website deployed."
