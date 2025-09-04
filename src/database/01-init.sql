-- Idempotent PostgreSQL database initialization
-- All statements use IF NOT EXISTS to ensure they can be run multiple times safely

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    tier VARCHAR(50) DEFAULT 'free',
    tenant_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add tenant_id column if it doesn't exist (for existing installations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();

-- Create sessions table if not exists
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create integrations table if not exists
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    config JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tickets table if not exists
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50),
    priority VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Create or replace update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if not exist (using DROP IF EXISTS + CREATE pattern for idempotency)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create workflow_triggers table to track all automation interactions
CREATE TABLE IF NOT EXISTS workflow_triggers (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    metadata JSONB,
    webhook_id VARCHAR(255),
    response_status INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_metrics table for aggregated data
CREATE TABLE IF NOT EXISTS admin_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE DEFAULT CURRENT_DATE,
    total_triggers INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    successful_triggers INTEGER DEFAULT 0,
    failed_triggers INTEGER DEFAULT 0,
    triggers_by_type JSONB,
    triggers_by_action JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for workflow triggers
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_user ON workflow_triggers(user_email);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type ON workflow_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_date ON workflow_triggers(triggered_at);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_date ON admin_metrics(metric_date);

-- SECURITY NOTE: Default admin users will be created with hashed passwords via migration script
-- These plaintext password inserts are removed for security
-- Run migrate-passwords.js after database initialization to create secure admin accounts

-- System configuration table is created in 02-add_system_config.sql

-- Create webhook traffic capture table for debugging
CREATE TABLE IF NOT EXISTS webhook_traffic (
    id SERIAL PRIMARY KEY,
    request_url TEXT NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    request_headers JSONB,
    request_body TEXT,
    request_query JSONB,
    request_params JSONB,
    response_status INTEGER,
    response_body TEXT,
    source_ip VARCHAR(45),
    user_agent TEXT,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_webhook BOOLEAN DEFAULT false,
    endpoint_category VARCHAR(50)
);

-- Create indexes for webhook traffic
CREATE INDEX IF NOT EXISTS idx_webhook_traffic_captured_at ON webhook_traffic(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_traffic_is_webhook ON webhook_traffic(is_webhook);
CREATE INDEX IF NOT EXISTS idx_webhook_traffic_endpoint ON webhook_traffic(endpoint_category);
CREATE INDEX IF NOT EXISTS idx_webhook_traffic_method ON webhook_traffic(request_method);

-- Enable pgvector extension for vector operations (REQUIRED)
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG: Tenant callback tokens
CREATE TABLE IF NOT EXISTS rag_tenant_tokens (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    callback_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG: Raw documents storage
CREATE TABLE IF NOT EXISTS rag_documents (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID DEFAULT gen_random_uuid(),
    callback_id VARCHAR(64) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG: Vector storage with pgvector (REQUIRED for embeddings)
CREATE TABLE IF NOT EXISTS rag_vectors (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL, -- OpenAI-compatible 1536-dimensional vectors
    chunk_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG: Webhook retry queue
CREATE TABLE IF NOT EXISTS rag_webhook_failures (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    webhook_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG: Conversations
CREATE TABLE IF NOT EXISTS rag_conversations (
    id SERIAL PRIMARY KEY,
    conversation_id UUID DEFAULT gen_random_uuid() UNIQUE,
    tenant_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG: Message history
CREATE TABLE IF NOT EXISTS rag_messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_docs_tenant ON rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_callback ON rag_documents(callback_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_tenant ON rag_vectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_doc ON rag_vectors(document_id);
-- Create vector similarity index for fast searches (IVFFlat for large datasets)
-- Note: For small datasets, you might skip this index or use HNSW instead
CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON rag_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON rag_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON rag_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_status ON rag_webhook_failures(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_tenant_tokens ON rag_tenant_tokens(tenant_id);