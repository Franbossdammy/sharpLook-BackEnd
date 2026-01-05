# 🚀 SHARPLOOK BACKEND - DEPLOYMENT GUIDE

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling & Performance](#scaling--performance)

---

## 1. PREREQUISITES

### Required Software:
- Node.js v18+ (LTS recommended)
- MongoDB 6.0+
- Redis 7.0+ (for caching & sessions)
- PM2 (for process management)
- Nginx (reverse proxy)
- SSL Certificate (Let's Encrypt)

### Required Accounts:
- Paystack account (payment processing)
- Cloudinary account (file uploads)
- Firebase account (push notifications)
- MongoDB Atlas (optional, for managed database)
- AWS/DigitalOcean/Heroku (hosting)

---

## 2. ENVIRONMENT SETUP

### Create `.env` file:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/sharplook
# OR MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sharplook

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-token-secret-key
JWT_REFRESH_EXPIRE=30d

# Paystack
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (NodeMailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=SharpLook <noreply@sharplook.com>

# SMS Configuration (Twilio/Termii)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Redis (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Frontend URL (for CORS)
FRONTEND_URL=https://sharplook.com
ADMIN_URL=https://admin.sharplook.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

# Google Maps (Optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
```

---

## 3. DATABASE SETUP

### Local MongoDB Setup:

```bash
# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongosh
> use sharplook
> db.createUser({
    user: "sharplook_user",
    pwd: "secure_password",
    roles: ["readWrite", "dbAdmin"]
  })
```

### MongoDB Atlas Setup (Cloud):

1. Go to mongodb.com/cloud/atlas
2. Create a cluster
3. Add database user
4. Whitelist IP addresses (or 0.0.0.0/0 for all)
5. Get connection string
6. Update MONGODB_URI in .env

### Database Indexes:

```bash
# Run index creation (automatic on first run)
npm run migrate
```

---

## 4. APPLICATION DEPLOYMENT

### Option A: Traditional Server (Ubuntu/Debian)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 2: Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/sharplook-backend.git
cd sharplook-backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Copy environment file
cp .env.example .env
nano .env  # Edit with your values
```

#### Step 3: PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'sharplook-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start application:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

#### Step 4: Nginx Configuration

Create `/etc/nginx/sites-available/sharplook`:

```nginx
upstream sharplook {
    least_conn;
    server 127.0.0.1:5000;
    # Add more backend servers for load balancing
    # server 127.0.0.1:5001;
    # server 127.0.0.1:5002;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
    listen 80;
    server_name api.sharplook.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sharplook.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.sharplook.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sharplook.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Client body size
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://sharplook;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://sharplook;
    }
}
```

Enable site:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/sharplook /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d api.sharplook.com
```

---

### Option B: Docker Deployment

#### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

#### docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

Deploy with Docker:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

### Option C: Platform as a Service (Heroku/Railway)

#### Heroku Deployment:

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create sharplook-backend

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# ... set all other env vars

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

---

## 5. CI/CD PIPELINE

### GitHub Actions (.github/workflows/deploy.yml):

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/sharplook-backend
            git pull origin main
            npm install
            npm run build
            pm2 restart sharplook-backend
```

---

## 6. MONITORING & LOGGING

### PM2 Monitoring:

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs sharplook-backend

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Application Monitoring (Optional):

```bash
# Install New Relic
npm install newrelic --save

# Or Sentry
npm install @sentry/node --save
```

---

## 7. SCALING & PERFORMANCE

### Horizontal Scaling:

1. Add more PM2 instances
2. Setup load balancer (Nginx)
3. Use MongoDB replica set
4. Implement Redis caching
5. CDN for static assets

### Performance Optimization:

```javascript
// Enable compression
app.use(compression());

// Cache static assets
app.use(express.static('public', {
  maxAge: '1y'
}));

// Database connection pooling
mongoose.connect(uri, {
  maxPoolSize: 50,
  minPoolSize: 10
});
```

---

## 🔒 SECURITY CHECKLIST

- [ ] Environment variables secured
- [ ] SSL certificate installed
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Helmet.js enabled
- [ ] MongoDB authentication enabled
- [ ] Firewall rules configured
- [ ] Regular backups scheduled
- [ ] Monitoring alerts setup
- [ ] Logs regularly reviewed

---

## 📊 POST-DEPLOYMENT

### 1. Health Checks:

```bash
curl https://api.sharplook.com/health
```

### 2. Database Backup:

```bash
# Automated backup script
0 2 * * * mongodump --uri=$MONGODB_URI --out=/backups/$(date +\%Y\%m\%d)
```

### 3. Performance Testing:

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API
ab -n 1000 -c 100 https://api.sharplook.com/api/v1/categories
```

---

**Deployment Complete!** 🎉

Your SharpLook backend is now live and ready to serve requests!
