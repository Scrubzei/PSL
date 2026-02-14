#!/bin/bash
# Push code from local machine to server
# Usage: bash deploy/push.sh

set -e

SERVER="slb"
REMOTE_PATH="/var/www/slb"

# Get the script's directory to find repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Building locally ==="

cd "$REPO_ROOT/services/website"
npm install
npm run build

cd "$REPO_ROOT/services/server"
npm install
npm run build

cd "$REPO_ROOT/services/botzei"
npm install
npm run build

echo "=== Pushing to $SERVER ==="

# Create remote directory
ssh $SERVER "mkdir -p $REMOTE_PATH"

# Sync files (excluding node_modules, .git, etc. but INCLUDING dist folders)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  "$REPO_ROOT/" \
  $SERVER:$REMOTE_PATH/

# Copy production .env files
echo "=== Copying .env files ==="
scp "$REPO_ROOT/deploy/.env.production" $SERVER:$REMOTE_PATH/services/server/.env
scp "$REPO_ROOT/deploy/.env.production.botzei" $SERVER:$REMOTE_PATH/services/botzei/.env

echo "=== Starting services ==="

ssh $SERVER << 'EOF'
  # Backend
  cd /var/www/slb/services/server
  npm install --production
  npm run migration:run
  pm2 describe slb-backend > /dev/null 2>&1 && pm2 restart slb-backend || pm2 start dist/main.js --name slb-backend

  # Botzei
  cd /var/www/slb/services/botzei
  npm install --production
  node dist/deploy-commands.js
  pm2 describe slb-botzei > /dev/null 2>&1 && pm2 restart slb-botzei || pm2 start dist/index.js --name slb-botzei

  pm2 save
EOF

echo "=== Done ==="
echo "Site should be live at https://1v1leaderboards.com"
