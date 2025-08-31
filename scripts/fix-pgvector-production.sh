#!/bin/bash

# Fix pgvector in production database
# This script should be run once on the production server

echo "🔧 Fixing pgvector extension in production database..."

# Get the container name (it might be onboarding_postgres_1 or onboarding-postgres-1)
POSTGRES_CONTAINER=$(docker ps --format "table {{.Names}}" | grep postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ PostgreSQL container not found!"
    exit 1
fi

echo "📦 Found PostgreSQL container: $POSTGRES_CONTAINER"

# Install pgvector extension as superuser
echo "🔄 Installing pgvector extension..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d resolve_onboarding << EOF
-- Create extension as superuser
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions to resolve_user
GRANT ALL ON SCHEMA public TO resolve_user;
GRANT USAGE ON TYPE vector TO resolve_user;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
EOF

if [ $? -eq 0 ]; then
    echo "✅ pgvector extension installed successfully!"
    
    # Test vector operations
    echo "🧪 Testing vector operations..."
    docker exec -i $POSTGRES_CONTAINER psql -U resolve_user -d resolve_onboarding << EOF
SELECT '[1,2,3]'::vector as test_vector;
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ Vector operations working correctly!"
    else
        echo "⚠️ Vector operations test failed, but extension is installed"
    fi
else
    echo "❌ Failed to install pgvector extension"
    echo "You may need to connect as the postgres superuser manually"
fi

echo "🔍 Current extensions:"
docker exec -i $POSTGRES_CONTAINER psql -U resolve_user -d resolve_onboarding -c "\dx"