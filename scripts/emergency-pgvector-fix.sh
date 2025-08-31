#!/bin/bash

# Emergency fix to manually install pgvector in production
# Run this on the production server

echo "🚨 EMERGENCY PGVECTOR FIX - Manual Installation"
cd /opt/onboarding

# Use the official postgres:15 image and manually install pgvector
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "80:5000"
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=postgresql://resolve_user:resolve_pass@postgres:5432/resolve_onboarding
    volumes:
      - ./uploads:/app/uploads
    networks:
      - resolve-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: resolve_onboarding
      POSTGRES_USER: resolve_user
      POSTGRES_PASSWORD: resolve_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - resolve-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U resolve_user -d resolve_onboarding"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  resolve-network:
    driver: bridge
EOF

# Stop everything
docker-compose down -v

# Start postgres with regular image
docker-compose up -d postgres

# Wait for postgres
echo "Waiting for PostgreSQL..."
sleep 10

# Install pgvector manually
echo "Installing pgvector extension manually..."
docker-compose exec -T postgres bash << 'INSTALL_SCRIPT'
apt-get update
apt-get install -y build-essential postgresql-server-dev-15 git

cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

# Create extension
psql -U resolve_user -d resolve_onboarding -c "CREATE EXTENSION vector;"
psql -U resolve_user -d resolve_onboarding -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
INSTALL_SCRIPT

# Start app
docker-compose up -d app

echo "✅ Manual pgvector installation complete!"