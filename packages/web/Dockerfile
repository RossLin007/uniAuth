# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json for all packages to safeguard workspace install
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
# Copy other packages just in case of dependencies (exclude if strictly not needed but good for monorepo safety)
COPY packages/developer-console/package.json ./packages/developer-console/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/client-sdk/package.json ./packages/client-sdk/
COPY packages/server-sdk/package.json ./packages/server-sdk/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and config
COPY packages/web ./packages/web
COPY packages/client-sdk ./packages/client-sdk
# Copy shared configs if needed
COPY tsconfig.json ./

# Build
WORKDIR /app/packages/web

# Receive API URL during build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# Stage 2: Serve
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy nginx config
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
