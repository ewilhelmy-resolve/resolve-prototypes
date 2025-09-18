# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Production build stage
FROM base AS production-deps
RUN npm ci --only=production

# Development build stage
FROM base AS dev-deps
RUN npm ci

# Build stage (if you have any build steps)
FROM dev-deps AS build
COPY . .
# Add any build commands here
# RUN npm run build

# Production runtime stage  
FROM mcr.microsoft.com/playwright:v1.38.1-focal AS production

# Set Playwright browser path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Disable rate limiting for tests
ENV DISABLE_RATE_LIMIT=true

# Create non-root user (Ubuntu style)
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy ALL dependencies (including dev) for testing capability
COPY --from=dev-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs logs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Use PM2 for production
CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]

# Development stage
FROM dev-deps AS development

WORKDIR /app

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]

# Test Runner stage - Use Ubuntu for Playwright compatibility
FROM mcr.microsoft.com/playwright:v1.55.0-noble AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]