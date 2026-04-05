# ServiceFlow - Technical Installation Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Docker Installation](#docker-installation)
4. [Manual Installation](#manual-installation)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Application Build](#application-build)
8. [Reverse Proxy Setup](#reverse-proxy-setup)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Systemd Services](#systemd-services)
11. [Production Checklist](#production-checklist)

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| CPU | 2 cores | 4 cores | 8+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| Storage | 20 GB | 50 GB | 100+ GB SSD |
| Network | 100 Mbps | 1 Gbps | 1 Gbps |

### Software Requirements

| Software | Version | Notes |
|----------|---------|-------|
| Docker | 20.x+ | Required for Docker installation |
| Docker Compose | 2.x+ | Required for Docker installation |
| Node.js | 20.x | Required for manual installation |
| PostgreSQL | 14+ | Required |
| Nginx | 1.18+ | Recommended reverse proxy |
| Ubuntu | 20.04+ | Recommended OS |

---

## Installation Methods

### Method 1: Docker (Recommended)

**Pros:**
- Fastest setup
- Isolated environment
- Easy updates
- Consistent across platforms

**Cons:**
- Requires Docker knowledge
- More resources
- Additional layer to debug

### Method 2: Manual

**Pros:**
- Full control
- Lower resource usage
- No Docker dependency
- Direct access to logs

**Cons:**
- Complex setup
- Manual dependency management
- Platform-specific issues

---

## Docker Installation

### 1. Install Docker

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 3. Clone Repository

```bash
# Clone the repository
git clone https://github.com/sp990063/service-workflow.git
cd service-workflow
```

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

Required variables:
```bash
POSTGRES_USER=serviceflow
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=serviceflow
JWT_SECRET=your_secure_jwt_secret_min_32_chars
```

### 5. Deploy

```bash
# Build and start
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 6. Verify

```bash
# Test API
curl http://localhost:3000/health

# Open browser
# http://localhost
```

---

## Manual Installation

### 1. Install Node.js 20

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install PostgreSQL 16

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# Update and install
sudo apt update
sudo apt install -y postgresql-16

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Install Git

```bash
sudo apt install -y git
```

---

## Environment Configuration

### Backend Environment

Create `/etc/environment` or use systemd unit:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://serviceflow:password@localhost:5432/serviceflow
JWT_SECRET=your_secure_secret_here_min_32_characters
FRONTEND_URL=https://yourdomain.com
```

### Frontend Environment

In `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://yourdomain.com',
};
```

---

## Database Setup

### Create PostgreSQL User and Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Execute SQL commands
CREATE USER serviceflow WITH PASSWORD 'your_password';
CREATE DATABASE serviceflow OWNER serviceflow;
GRANT ALL PRIVILEGES ON DATABASE serviceflow TO serviceflow;

# Exit psql
\q

# Test connection
psql -h localhost -U serviceflow -d serviceflow
\password  # Set password
\q
```

### Run Migrations

```bash
cd backend

# Create .env file with DATABASE_URL
echo "DATABASE_URL=postgresql://serviceflow:password@localhost:5432/serviceflow" > .env

# Run migrations
npx prisma migrate deploy

# Seed database (creates default users)
npx prisma db seed
```

---

## Application Build

### Backend Build

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build
npm run build

# The built application is in ./dist
```

### Frontend Build

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output is in ./dist/service-workflow
```

---

## Reverse Proxy Setup

### Nginx Configuration

Create `/etc/nginx/sites-available/serviceflow`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # RBAC API
    location /rbac {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth
    location /auth {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (Angular)
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/serviceflow /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renew (test the renewal)
sudo certbot renew --dry-run

# If successful, add to cron
echo "0 0 * * * certbot renew" | sudo tee /etc/cron.d/certbot
```

---

## Systemd Services

### Backend Service

Create `/etc/systemd/system/serviceflow-api.service`:

```ini
[Unit]
Description=ServiceFlow API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/serviceflow/backend
ExecStart=/usr/bin/node dist/src/main.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=postgresql://serviceflow:password@localhost:5432/serviceflow
Environment=JWT_SECRET=your_secret_here

[Install]
WantedBy=multi-user.target
```

### Install Backend Service

```bash
# Copy service file
sudo cp /opt/serviceflow/backend/serviceflow-api.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start
sudo systemctl enable serviceflow-api
sudo systemctl start serviceflow-api

# Check status
sudo systemctl status serviceflow-api
```

---

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Enable SSL/TLS
- [ ] Configure firewall (ufw: allow 22, 80, 443)
- [ ] Disable root login (SSH)
- [ ] Use SSH keys for authentication
- [ ] Regular security updates

### Database

- [ ] Use strong PostgreSQL password
- [ ] Configure PostgreSQL authentication
- [ ] Enable PostgreSQL logging
- [ ] Regular backups scheduled
- [ ] Test backup restoration
- [ ] Monitor disk space

### Application

- [ ] All services running
- [ ] Logs being captured
- [ ] Health checks configured
- [ ] Monitoring in place
- [ ] Error tracking configured
- [ ] Performance baseline established

### Operations

- [ ] Runbooks documented
- [ ] On-call procedures established
- [ ] Backup procedures tested
- [ ] Rollback plan prepared
- [ ] DNS configured
- [ ] SSL certificate valid

---

## Updates & Maintenance

### Docker Updates

```bash
# Pull latest
git pull origin master

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# View new version
docker-compose logs | head
```

### Manual Updates

```bash
# Pull latest code
git pull origin master

# Update dependencies
cd backend && npm update
cd frontend && npm update

# Rebuild
cd backend && npm run build
cd frontend && npm run build

# Restart service
sudo systemctl restart serviceflow-api
```

---

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

### Log Locations

**Docker:**
```bash
docker-compose logs -f
```

**Systemd:**
```bash
sudo journalctl -u serviceflow-api -f
```

**Nginx:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :80

# Kill process
sudo kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if listening
sudo netstat -tlnp | grep 5432

# Check credentials
psql -h localhost -U serviceflow -d serviceflow -W
```

### Permission Denied

```bash
# Fix ownership
sudo chown -R www-data:www-data /opt/serviceflow
sudo chmod -R 755 /opt/serviceflow
```

---

## Support

- **GitHub Issues**: https://github.com/sp990063/service-workflow/issues
- **Documentation**: https://github.com/sp990063/service-workflow/tree/master/docs

---

**Version**: 1.0.0  
**Last Updated**: April 2026
