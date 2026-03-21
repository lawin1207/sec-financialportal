#!/bin/bash
# SEC Financial Portal - One-line Deploy Script
# Usage on Lightsail: curl -sL https://raw.githubusercontent.com/YOUR_GITHUB_USER/financial-portal/main/deploy.sh | bash
# Or after cloning:   bash deploy.sh

set -e

APP_DIR="/home/ubuntu/financial-portal"
REPO_URL="${REPO_URL:-https://github.com/lawin1207/sec-financialportal.git}"

echo "=== SEC Financial Portal Deployment ==="

# 1. Install Node.js 20 if not present
if ! command -v node &>/dev/null; then
  echo ">> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo ">> Node $(node -v)"

# 2. Install PM2 globally
if ! command -v pm2 &>/dev/null; then
  echo ">> Installing PM2..."
  sudo npm install -g pm2
fi

# 3. Install Nginx if not present
if ! command -v nginx &>/dev/null; then
  echo ">> Installing Nginx..."
  sudo apt-get update && sudo apt-get install -y nginx
fi

# 4. Clone or pull latest code
if [ -d "$APP_DIR" ]; then
  echo ">> Pulling latest code..."
  cd "$APP_DIR" && git pull
else
  echo ">> Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# 5. Install server dependencies
echo ">> Installing server dependencies..."
cd "$APP_DIR/server" && npm install --production

# 6. Install client dependencies and build
echo ">> Building frontend..."
cd "$APP_DIR/client" && npm install --legacy-peer-deps && npm run build

# 7. Setup .env if not exists
if [ ! -f "$APP_DIR/server/.env" ]; then
  echo ">> Creating .env from template..."
  cp "$APP_DIR/server/.env.example" "$APP_DIR/server/.env"
  echo ""
  echo "!! IMPORTANT: Edit $APP_DIR/server/.env with your production values:"
  echo "   - DATABASE_URL (RDS endpoint)"
  echo "   - JWT_SECRET (generate a strong secret)"
  echo "   - AWS credentials (S3 access)"
  echo "   - ANTHROPIC_API_KEY"
  echo ""
fi

# 8. Setup Nginx reverse proxy
echo ">> Configuring Nginx..."
sudo tee /etc/nginx/sites-available/financial-portal > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    # Serve React frontend
    root /home/ubuntu/financial-portal/client/dist;
    index index.html;

    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }

    # React SPA - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/financial-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 9. Start/restart backend with PM2
echo ">> Starting backend with PM2..."
cd "$APP_DIR/server"
pm2 delete financial-portal 2>/dev/null || true
pm2 start src/index.js --name financial-portal --env production
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo ""
echo "=== Deployment Complete! ==="
echo ">> Frontend: http://YOUR_LIGHTSAIL_IP"
echo ">> Backend:  http://YOUR_LIGHTSAIL_IP/api"
echo ""
echo "Next steps:"
echo "  1. Edit .env:  nano $APP_DIR/server/.env"
echo "  2. Setup RDS PostgreSQL and run migrations"
echo "  3. Restart:    pm2 restart financial-portal"
echo ""
