# Multi-stage Dockerfile for Resolve Onboarding Application

# Stage 1: Base image with dependencies
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm install pg

# Stage 2: Development
FROM base AS development
RUN npm install
COPY . .
EXPOSE 8082
CMD ["npm", "run", "dev"]

# Stage 3: Production Build
FROM base AS production
RUN apk add --no-cache curl
COPY . .
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 8082
CMD ["node", "server-enhanced.js"]

# Stage 4: Test Runner
FROM node:18-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci && \
    npx playwright install-deps && \
    npx playwright install
COPY . .
CMD ["npm", "test"]