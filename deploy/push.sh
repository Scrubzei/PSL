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

# Copy production .env file for server
echo "=== Copying .env file ==="
scp "$REPO_ROOT/deploy/.env.production" $SERVER:$REMOTE_PATH/services/server/.env

echo "=== Starting server ==="

ssh $SERVER << 'EOF'
  cd /var/www/slb/services/server
  npm install --production
  npm run migration:run

  # Start or restart with PM2
  pm2 describe slb-backend > /dev/null 2>&1 && pm2 restart slb-backend || pm2 start dist/main.js --name slb-backend
  pm2 save
EOF

echo "=== Done ==="
echo "Site should be live at https://1v1leaderboards.com"
