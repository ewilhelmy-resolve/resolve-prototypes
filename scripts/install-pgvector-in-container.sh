#!/bin/bash

# Emergency script to install pgvector in a running PostgreSQL container
# This should be run on the production server if pgvector image isn't working

echo "🔧 Installing pgvector extension in running container..."

cd /opt/onboarding

# Install build dependencies and pgvector in the container
docker-compose exec -T postgres bash << 'EOF'
apt-get update
apt-get install -y build-essential postgresql-server-dev-15 git

# Clone and build pgvector
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

# Verify installation
ls -la /usr/share/postgresql/15/extension/vector*
EOF

# Now create the extension
echo "Creating pgvector extension in database..."
docker-compose exec -T postgres psql -U resolve_user -d resolve_onboarding -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify it works
echo "Testing vector operations..."
docker-compose exec -T postgres psql -U resolve_user -d resolve_onboarding -c "SELECT '[1,2,3]'::vector as test;"