# ==============================================================================
# SYNTECH DC - Production Dockerfile for Google Cloud Run / Container Platforms
# Multi-stage build for ultra-compact and secure runtime
# ==============================================================================

# STAGE 1: Build Frontend and Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full source tree
COPY . .

# Build Vite frontend and bundled Node server
ENV NODE_ENV=production
RUN npm run build

# Prune devDependencies for minimal runtime image
RUN npm prune --production

# ==============================================================================
# STAGE 2: Production Execution Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: non-root user
USER node

# Copy built artifacts and production dependencies
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start bundled Node.js server
CMD ["node", "dist/server.cjs"]
