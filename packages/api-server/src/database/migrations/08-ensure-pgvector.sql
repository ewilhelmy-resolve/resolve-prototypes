-- Migration: Ensure pgvector extension is installed
-- This is critical for vector search functionality

-- Try to create pgvector extension if not exists
-- This should already be done by 00-init-pgvector.sql, but we check again to be safe
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension ensured';
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Check if extension already exists
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
            RAISE NOTICE 'pgvector extension already installed';
        ELSE
            RAISE WARNING 'Cannot create pgvector extension - insufficient privileges';
        END IF;
END $$;

-- Add error logging columns to vector_search_logs if they don't exist
ALTER TABLE vector_search_logs 
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS error_code VARCHAR(10);

-- Create index on vector columns for better performance
CREATE INDEX IF NOT EXISTS idx_rag_vectors_embedding ON rag_vectors USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_tenant_id ON rag_vectors(tenant_id);

-- Verify pgvector is working by creating a test
DO $$
BEGIN
    -- Try to cast to vector type
    PERFORM '[1,2,3]'::vector;
    RAISE NOTICE 'pgvector is installed and working correctly';
EXCEPTION
    WHEN undefined_object THEN
        RAISE WARNING 'pgvector extension is not available - vector search will not work!';
        RAISE WARNING 'Please install pgvector extension manually: CREATE EXTENSION vector;';
END $$;