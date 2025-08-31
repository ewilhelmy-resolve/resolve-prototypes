-- This file runs first (00-) to ensure pgvector is installed before any other migrations
-- It runs as the postgres superuser during container initialization

-- Create the pgvector extension
-- This will work because it runs during docker-entrypoint-initdb.d initialization
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant necessary privileges to resolve_user
GRANT ALL ON SCHEMA public TO resolve_user;

-- Ensure resolve_user can use vector type
GRANT USAGE ON TYPE vector TO resolve_user;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'pgvector extension installed successfully';
END $$;