-- This file runs first (00-) to ensure pgvector is installed before any other migrations
-- It runs as the postgres superuser during container initialization

-- Create the pgvector extension
-- This will work because it runs during docker-entrypoint-initdb.d initialization
CREATE EXTENSION IF NOT EXISTS vector;

-- Skip permission grants for Supabase (running as postgres user)
-- In Supabase, we connect as the postgres user which already has all permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resolve_user') THEN
        GRANT ALL ON SCHEMA public TO resolve_user;
        GRANT USAGE ON TYPE vector TO resolve_user;
    END IF;
END $$;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'pgvector extension installed successfully';
END $$;