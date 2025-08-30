-- Migration 06: Add vector search logs table for analytics and monitoring
-- This migration creates a table to track vector search operations

-- Create vector_search_logs table (idempotent)
CREATE TABLE IF NOT EXISTS vector_search_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    search_id UUID DEFAULT gen_random_uuid(),
    query_vector vector(1536),
    result_count INTEGER,
    threshold FLOAT,
    execution_time_ms INTEGER,
    filters_applied JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_search_logs_tenant ON vector_search_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON vector_search_logs(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE vector_search_logs IS 'Tracks all vector search operations for analytics and monitoring';
COMMENT ON COLUMN vector_search_logs.tenant_id IS 'UUID of the tenant performing the search';
COMMENT ON COLUMN vector_search_logs.search_id IS 'Unique identifier for this search operation';
COMMENT ON COLUMN vector_search_logs.query_vector IS 'The vector used for similarity search';
COMMENT ON COLUMN vector_search_logs.result_count IS 'Number of results returned';
COMMENT ON COLUMN vector_search_logs.threshold IS 'Similarity threshold used for filtering';
COMMENT ON COLUMN vector_search_logs.execution_time_ms IS 'Time taken to execute search in milliseconds';
COMMENT ON COLUMN vector_search_logs.filters_applied IS 'Any additional filters applied to the search';