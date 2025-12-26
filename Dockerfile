# UniAuth Dockerfile
# Multi-stage build for optimized production image

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/

# Install dependencies with flat hoisting for Docker compatibility
RUN pnpm install --frozen-lockfile --prod=false --shamefully-hoist

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules

# Copy source code
COPY packages/server ./packages/server
COPY tsconfig.json ./

# Build the application
WORKDIR /app/packages/server
RUN pnpm build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set to production environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 uniauth

# Copy built application
COPY --from=builder --chown=uniauth:nodejs /app/packages/server/dist ./dist
COPY --from=builder --chown=uniauth:nodejs /app/packages/server/package.json ./

# Copy production dependencies (hoisted to root in pnpm monorepo)
COPY --from=deps --chown=uniauth:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER uniauth

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
