-- Migration script to convert TEXT embeddings to vector type
-- This is for existing deployments that need to be upgraded

-- 1. Create pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Check if rag_vectors table exists and has correct column type
-- If the embedding column is already a vector type, this will do nothing
-- If it's text type, we'll handle it in the application logic instead
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_vectors') THEN
        -- Check if embedding column exists and is text type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'rag_vectors' 
            AND column_name = 'embedding' 
            AND data_type = 'text'
        ) THEN
            -- Log warning that manual migration may be needed
            RAISE NOTICE 'rag_vectors.embedding is TEXT type - manual migration may be needed';
        END IF;
    END IF;
END $$;

-- 3. Recreate the index with proper syntax (if table exists)
DROP INDEX IF EXISTS idx_vectors_embedding;

-- Only create index if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_vectors') THEN
        -- Check if embedding column is vector type before creating index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'rag_vectors' 
            AND column_name = 'embedding' 
            AND udt_name = 'vector'
        ) THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON rag_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
        END IF;
    END IF;
END $$;

-- 4. Grant permissions if needed (wrapped in DO block to handle if user doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'resolve_user') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_vectors') THEN
            GRANT SELECT, INSERT, UPDATE, DELETE ON rag_vectors TO resolve_user;
        END IF;
    END IF;
END $$;