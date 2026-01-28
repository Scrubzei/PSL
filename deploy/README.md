# SLB Deployment Guide

## EC2 Setup (Ubuntu 22.04)

### 1. Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: `t3.micro` (free tier) or `t3.small`
- Storage: 20GB gp3
- Security Group:
  - SSH (22) - Your IP only
  - HTTP (80) - Anywhere
  - HTTPS (443) - Anywhere

### 2. Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. Run Setup Script
```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/slb.git /var/www/slb

# Run setup
sudo bash /var/www/slb/deploy/setup-server.sh
```

### 4. Configure Environment
```bash
# Edit backend environment
cp /var/www/slb/deploy/.env.production /var/www/slb/backend/.env
nano /var/www/slb/backend/.env

# Update these values:
# - DATABASE_PASSWORD (must match what you set in setup-server.sh)
# - JWT_SECRET (generate with: openssl rand -hex 32)
# - DISCORD_CLIENT_ID
# - DISCORD_CLIENT_SECRET
# - DISCORD_CALLBACK_URL (https://yourdomain.com/auth/discord/callback)
# - FRONTEND_URL (https://yourdomain.com)
```

### 5. Deploy Application
```bash
cd /var/www/slb
bash deploy/deploy.sh
```

### 6. Configure Nginx
```bash
# Edit nginx config with your domain
sudo nano /var/www/slb/deploy/nginx.conf
# Change YOUR_DOMAIN.com to your actual domain

# Enable site
sudo cp /var/www/slb/deploy/nginx.conf /etc/nginx/sites-available/slb
sudo ln -s /etc/nginx/sites-available/slb /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL (Free with Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### 8. Configure PM2 Startup
```bash
pm2 startup
# Run the command it outputs
pm2 save
```

---

## Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Create New Application
3. Go to OAuth2 > General
4. Add Redirect: `https://yourdomain.com/auth/discord/callback`
5. Copy Client ID and Client Secret to your `.env`

---

## Updating the App

```bash
cd /var/www/slb
bash deploy/deploy.sh
```

---

## Useful Commands

```bash
# View backend logs
pm2 logs slb-backend

# Restart backend
pm2 restart slb-backend

# Check nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Backup Database

```bash
# Create backup
sudo -u postgres pg_dump slb_db > backup_$(date +%Y%m%d).sql

# Restore backup
sudo -u postgres psql slb_db < backup_20240101.sql
```

---

## Estimated Costs

| Resource | Monthly Cost |
|----------|-------------|
| EC2 t3.micro | ~$8 (or free first year) |
| Domain | ~$12/year |
| SSL | Free (Let's Encrypt) |
| **Total** | **~$8-10/month** |
