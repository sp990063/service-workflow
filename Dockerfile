# ============================================
# ServiceFlow - Production Docker Configuration
# ============================================

# Stage 1: Backend Build
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Stage 2: Backend Production
FROM node:20-bookworm AS backend-production

WORKDIR /app/backend

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema and migrations
COPY backend/prisma ./prisma

# Copy built application
COPY --from=backend-builder /app/backend/dist ./dist

# Generate Prisma client for current platform (Debian/bookworm)
RUN rm -rf node_modules/.prisma && npx prisma generate

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]

# ============================================
# Stage 3: Frontend Build
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY frontend/ .

# Build Angular application
RUN npm run build

# ============================================
# Stage 4: Frontend Production (Nginx)
# ============================================
FROM nginx:alpine AS frontend-production

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app
COPY --from=frontend-builder /app/frontend/dist/service-workflow /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================
# Docker Compose Production Stack
# ============================================
# See docker-compose.yml for full stack deployment
