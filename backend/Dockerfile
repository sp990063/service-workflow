# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-bookworm

WORKDIR /app

ENV DATABASE_URL="file:/app/data/serviceflow.db"

RUN mkdir -p /app/data

COPY package*.json ./
RUN npm ci --legacy-peer-deps --only=production && npm cache clean --force
RUN npm install @prisma/client@5.22.0 prisma@5.22.0 --legacy-peer-deps --save-exact

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma/

RUN rm -rf node_modules/.prisma && npx prisma generate

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/src/main"]
