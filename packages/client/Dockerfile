# Multi-stage build for production with pnpm
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/client/package.json ./packages/client/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --frozen-lockfile --offline --ignore-scripts
RUN pnpm --filter rita-client build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=build /app/packages/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
