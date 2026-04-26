#!/bin/bash
set -e

SERVER="slb"
REMOTE_PATH="/var/www/slb"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Building bot ==="
cd "$REPO_ROOT/services/botzei"
npm install
npm run build

echo "=== Pushing bot to $SERVER ==="
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  --exclude 'data' \
  "$REPO_ROOT/services/botzei/" \
  $SERVER:$REMOTE_PATH/services/botzei/

scp "$REPO_ROOT/deploy/.env.production.botzei" $SERVER:$REMOTE_PATH/services/botzei/.env

echo "=== Restarting bot ==="
ssh $SERVER << 'EOF'
  cd /var/www/slb/services/botzei
  npm install --production
  node dist/deploy-commands.js
  pm2 describe slb-botzei > /dev/null 2>&1 && pm2 restart slb-botzei || pm2 start dist/index.js --name slb-botzei
  pm2 save
EOF

echo "=== Done ==="
echo "Bot deployed."
