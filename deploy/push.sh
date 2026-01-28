#!/bin/bash
# Push code from local machine to server
# Usage: bash deploy/push.sh

set -e

SERVER="slb"
REMOTE_PATH="/var/www/slb"

echo "=== Pushing to $SERVER ==="

# Create remote directory
ssh $SERVER "mkdir -p $REMOTE_PATH"

# Sync files (excluding node_modules, dist, etc.)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  /Users/brynnafowler/Projects/Code/slb/ \
  $SERVER:$REMOTE_PATH/

echo "=== Building on server ==="

ssh $SERVER << 'EOF'
  cd /var/www/slb/backend
  npm install
  npm run build
  npm run migration:run

  # Start or restart with PM2
  pm2 describe slb-backend > /dev/null 2>&1 && pm2 restart slb-backend || pm2 start dist/main.js --name slb-backend
  pm2 save

  cd /var/www/slb/frontend
  npm install
  npm run build
EOF

echo "=== Done ==="
echo "Site should be live at https://1v1leaderboards.com"
