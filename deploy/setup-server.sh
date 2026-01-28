#!/bin/bash
# Run this script on a fresh Ubuntu 22.04 EC2 instance
# Usage: sudo bash setup-server.sh

set -e

echo "=== SLB Server Setup ==="

# Update system
echo "Updating system..."
apt update && apt upgrade -y

# Install essential packages
echo "Installing packages..."
apt install -y curl git nginx postgresql postgresql-contrib ufw

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Configure firewall
echo "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Create app directory
echo "Creating app directory..."
mkdir -p /var/www/slb
chown -R ubuntu:ubuntu /var/www/slb

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE USER slb_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE slb_db OWNER slb_user;
GRANT ALL PRIVILEGES ON DATABASE slb_db TO slb_user;
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update the PostgreSQL password in this script and /var/www/slb/backend/.env"
echo "2. Clone your repo to /var/www/slb"
echo "3. Run: bash /var/www/slb/deploy/deploy.sh"
echo "4. Configure nginx: sudo cp /var/www/slb/deploy/nginx.conf /etc/nginx/sites-available/slb"
echo "5. Enable site: sudo ln -s /etc/nginx/sites-available/slb /etc/nginx/sites-enabled/"
echo "6. Remove default: sudo rm /etc/nginx/sites-enabled/default"
echo "7. Test & reload: sudo nginx -t && sudo systemctl reload nginx"
echo "8. Setup SSL: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx"
