# ServiceFlow - Production Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Quick Start](#quick-start)
4. [Docker Deployment](#docker-deployment)
5. [Manual Installation](#manual-installation)
6. [Configuration](#configuration)
7. [Initial Setup](#initial-setup)
8. [Backup & Recovery](#backup--recovery)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

ServiceFlow is a workflow automation platform with:
- **Form Builder** - Drag-and-drop form creation
- **Workflow Designer** - Visual workflow automation
- **RBAC** - Role-based access control
- **Approval Workflows** - Multi-step approval processes

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |
| Docker | 20.x | Latest |
| Docker Compose | 2.x | Latest |

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/sp990063/service-workflow.git
cd service-workflow

# Copy environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Start with Docker

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Access Application

- **URL**: http://localhost
- **Default Admin**: admin@example.com / password123
- **Default Manager**: manager@example.com / password123
- **Default User**: employee@example.com / password123

---

## Docker Deployment

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Network                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Nginx      │    │     NestJS Backend       │  │
│  │   (Frontend) │◄──►│     (API Server)         │  │
│  │   Port 80    │    │     Port 3000            │  │
│  └──────────────┘    └───────────┬──────────────┘  │
│                                   │                  │
│                                   ▼                  │
│                         ┌──────────────────────┐    │
│                         │    PostgreSQL        │    │
│                         │    Port 5432         │    │
│                         └──────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild after updates
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Scale (if needed)
docker-compose up -d --scale backend=2
```

### Data Persistence

Volumes are stored at:
- `~/.docker-volumes/serviceflow/postgres_data/` - Database

---

## Manual Installation

### Prerequisites

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 16
sudo apt-get install -y postgresql-16

# Nginx
sudo apt-get install -y nginx
```

### Database Setup

```bash
# Create PostgreSQL user and database
sudo -u postgres psql

CREATE USER serviceflow WITH PASSWORD 'your_password';
CREATE DATABASE serviceflow OWNER serviceflow;
\q

# Set password
sudo -u postgres psql -c "ALTER USER serviceflow WITH PASSWORD 'your_password';"
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed

# Build
npm run build

# Start
node dist/src/main.js
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build
npm run build

# Copy to nginx
sudo cp -r dist/service-workflow/* /usr/share/nginx/html/

# Configure nginx
sudo cp nginx.conf /etc/nginx/conf.d/default.conf
sudo nginx -t
sudo systemctl restart nginx
```

---

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes | - |
| `PORT` | Backend API port | No | 3000 |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost |

### Database URL Format

```
postgresql://username:password@host:5432/database
```

Example:
```
postgresql://serviceflow:MySecurePass@localhost:5432/serviceflow
```

---

## Initial Setup

### 1. Access Admin Panel

After deployment, navigate to http://your-server/ and login with:
- **Email**: admin@example.com
- **Password**: password123

### 2. Change Admin Password

1. Click on your profile (top-right)
2. Go to Profile Settings
3. Change password immediately!

### 3. Create Users

1. Go to **Dashboard** → **Manage Users** (Admin only)
2. Click **Add User**
3. Fill in details and assign role:
   - **Admin** - Full system access
   - **Manager** - Workflow and approval management
   - **User** - Basic form and workflow usage

### 4. Create Workflows

1. Go to **Workflow Designer**
2. Drag nodes from the palette
3. Connect nodes by dragging from output to input
4. Configure each node's properties
5. Click **Save Workflow**

### 5. Create Forms

1. Go to **Form Builder**
2. Drag elements from the palette
3. Configure element properties (label, required, validation)
4. Click **Save Form**

---

## Backup & Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U serviceflow serviceflow > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_file.sql | docker-compose exec -T postgres psql -U serviceflow serviceflow
```

### Automated Backups

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * docker-compose exec postgres pg_dump -U serviceflow serviceflow > /backups/serviceflow_$(date +\%Y\%m\%d).sql
```

---

## Monitoring

### Health Check

```bash
# API health
curl http://localhost:3000/health

# Frontend
curl http://localhost/health
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
docker stats
```

---

## Troubleshooting

### Common Issues

#### 1. Frontend shows "Loading..." forever

**Cause**: Backend not running or unreachable

**Solution**:
```bash
docker-compose logs backend
docker-compose restart backend
```

#### 2. Login fails with "Invalid credentials"

**Cause**: Database not seeded or credentials incorrect

**Solution**:
```bash
# Re-run seed
docker-compose exec backend npx prisma db seed
```

#### 3. Database connection error

**Cause**: DATABASE_URL incorrect or PostgreSQL not running

**Solution**:
```bash
# Check PostgreSQL
docker-compose logs postgres

# Verify DATABASE_URL in .env
```

#### 4. Port already in use

**Cause**: Another service using port 80 or 3000

**Solution**:
```bash
# Change ports in docker-compose.yml
ports:
  - "8080:80"  # Change frontend port
  - "3001:3000"  # Change backend port
```

### Reset Everything

```bash
# Stop and remove volumes
docker-compose down -v

# Fresh start
docker-compose up -d --build

# Re-seed
docker-compose exec backend npx prisma db seed
```

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Configure SSL/TLS (use reverse proxy like Traefik or nginx with Let's Encrypt)
- [ ] Enable firewall (allow only 80, 443)
- [ ] Regular database backups
- [ ] Keep Docker images updated
- [ ] Review logs regularly

---

## Support

For issues and questions:
- **GitHub Issues**: https://github.com/sp990063/service-workflow/issues
- **Documentation**: See `/docs` folder

---

**Version**: 1.0.0  
**Last Updated**: April 2026
