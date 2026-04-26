#!/bin/bash
set -e

SERVER="slb"
REMOTE_PATH="/var/www/slb"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Building server ==="
cd "$REPO_ROOT/services/server"
npm install
npm run build

echo "=== Pushing server to $SERVER ==="
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  "$REPO_ROOT/services/server/" \
  $SERVER:$REMOTE_PATH/services/server/

scp "$REPO_ROOT/deploy/.env.production" $SERVER:$REMOTE_PATH/services/server/.env

echo "=== Restarting server ==="
ssh $SERVER << 'EOF'
  cd /var/www/slb/services/server
  npm install --production
  npm run migration:run
  pm2 describe slb-backend > /dev/null 2>&1 && pm2 restart slb-backend || pm2 start dist/main.js --name slb-backend
  pm2 save
EOF

echo "=== Done ==="
echo "Server deployed."
