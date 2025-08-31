#!/bin/bash

# Fix pgvector in production database
# This script should be run once on the production server from /opt/onboarding

echo "🔧 Fixing pgvector extension in production database..."

cd /opt/onboarding

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found! Make sure you're in /opt/onboarding"
    exit 1
fi

# Install pgvector extension using resolve_user (which is superuser in our setup)
echo "🔄 Installing pgvector extension..."
docker-compose exec -T postgres psql -U resolve_user -d resolve_onboarding << EOF
-- Create extension (resolve_user has superuser privileges)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify permissions
GRANT ALL ON SCHEMA public TO resolve_user;
GRANT USAGE ON TYPE vector TO resolve_user;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
EOF

if [ $? -eq 0 ]; then
    echo "✅ pgvector extension installed successfully!"
    
    # Test vector operations
    echo "🧪 Testing vector operations..."
    docker-compose exec -T postgres psql -U resolve_user -d resolve_onboarding << EOF
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
docker-compose exec -T postgres psql -U resolve_user -d resolve_onboarding -c "\dx"