#!/bin/bash
# Deploy script - run from /var/www/slb
# Usage: bash deploy/deploy.sh

set -e

START_TIME=$(date +%s)

echo "=== Deploying SLB ==="

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Backend
echo "Building backend..."
cd /var/www/slb/services/server
npm install --production=false
npm run build
npm run migration:run

# Restart backend with PM2
echo "Restarting backend..."
pm2 describe slb-backend > /dev/null 2>&1 && pm2 restart slb-backend || pm2 start dist/main.js --name slb-backend
pm2 save

# Frontend
echo "Building frontend..."
cd /var/www/slb/services/website
npm install
npm run build

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo "=== Deployment Complete ==="
echo "Backend running on PM2"
echo "Frontend built to: /var/www/slb/services/website/dist/website/browser"
echo "Deployed in ${MINUTES}m ${SECONDS}s"
