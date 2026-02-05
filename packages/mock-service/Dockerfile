# Mock Service Dockerfile - Multi-stage pnpm build
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/mock-service/package.json ./packages/mock-service/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --filter rita-mock-service

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/mock-service/node_modules ./packages/mock-service/node_modules
COPY packages/mock-service ./packages/mock-service
COPY package.json ./
RUN pnpm --filter rita-mock-service build

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/mock-service/package.json ./packages/mock-service/

# Install production deps only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts --filter rita-mock-service

# Copy built output
COPY --from=build /app/packages/mock-service/dist ./packages/mock-service/dist

RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "packages/mock-service/dist/index.js"]
