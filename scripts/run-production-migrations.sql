-- Production Database Migration Script
-- Run this in your production PostgreSQL database
-- IMPORTANT: Run these in order!

-- ============================================
-- 1. Enable pgvector extension (required for RAG features)
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. Core tables from 01-init.sql
-- ============================================
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID,
    webhook_failures INTEGER DEFAULT 0,
    last_webhook_failure TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(50) DEFAULT 'medium',
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID
);

-- CSV imports table
CREATE TABLE IF NOT EXISTS csv_imports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    row_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    tenant_id UUID
);

-- Metrics table
CREATE TABLE IF NOT EXISTS admin_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE DEFAULT CURRENT_DATE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_tickets INTEGER DEFAULT 0,
    open_tickets INTEGER DEFAULT 0,
    csv_imports INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);

-- ============================================
-- 3. System configuration table
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
    ('app_url', 'http://localhost:5000', 'Application base URL'),
    ('webhook_enabled', 'true', 'Enable webhook functionality'),
    ('max_document_size', '51200', 'Maximum document size in KB'),
    ('vector_dimension', '1536', 'Dimension of vector embeddings')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 4. RAG (Vector) tables
-- ============================================
-- Documents table
CREATE TABLE IF NOT EXISTS rag_documents (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID UNIQUE NOT NULL,
    original_filename VARCHAR(255),
    content TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    callback_id VARCHAR(255),
    callback_token VARCHAR(255),
    webhook_retry_count INTEGER DEFAULT 0,
    last_webhook_attempt TIMESTAMP,
    file_type VARCHAR(50),
    file_size INTEGER,
    display_content TEXT,
    has_markdown BOOLEAN DEFAULT false,
    is_processed BOOLEAN DEFAULT false
);

-- Vectors table with pgvector
CREATE TABLE IF NOT EXISTS rag_vectors (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    chunk_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS rag_conversations (
    id SERIAL PRIMARY KEY,
    conversation_id UUID UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    user_email VARCHAR(255),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Messages table
CREATE TABLE IF NOT EXISTS rag_messages (
    id SERIAL PRIMARY KEY,
    message_id UUID UNIQUE NOT NULL,
    conversation_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook failures table
CREATE TABLE IF NOT EXISTS rag_webhook_failures (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    webhook_type VARCHAR(50),
    payload JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table (for legacy support)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_email VARCHAR(255),
    message TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Vector search logs
CREATE TABLE IF NOT EXISTS vector_search_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    results_count INTEGER,
    search_time_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for RAG tables
CREATE INDEX IF NOT EXISTS idx_rag_documents_tenant ON rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_document_id ON rag_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_tenant ON rag_vectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_document ON rag_vectors(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_conversations_tenant ON rag_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_messages_conversation ON rag_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rag_messages_tenant ON rag_messages(tenant_id);

-- Create vector similarity search index (important for performance)
CREATE INDEX IF NOT EXISTS rag_vectors_embedding_idx ON rag_vectors 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 5. Add foreign key constraints
-- ============================================
ALTER TABLE rag_messages 
ADD CONSTRAINT fk_rag_messages_conversation 
FOREIGN KEY (conversation_id) 
REFERENCES rag_conversations(conversation_id) 
ON DELETE CASCADE;

-- ============================================
-- 6. Fix admin metrics constraint
-- ============================================
ALTER TABLE admin_metrics DROP CONSTRAINT IF EXISTS admin_metrics_metric_date_key;
ALTER TABLE admin_metrics ADD CONSTRAINT admin_metrics_metric_date_unique UNIQUE (metric_date);

-- ============================================
-- 7. Create default admin user (optional)
-- ============================================
-- Uncomment and modify if you want to create an admin user
-- INSERT INTO users (email, password, full_name, company, tenant_id, is_active)
-- VALUES (
--     'admin@resolve.io',
--     '$2a$10$8K1p/a/yKNkp1YGvRO0VBua9RwGJqVFPpuygP6z5VB4w0QSkB8Lmy', -- password: admin123
--     'Admin User',
--     'Resolve',
--     'f0f46118-5100-4ae1-a85d-9e445a2e0516',
--     true
-- ) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Verification queries
-- ============================================
-- Run these to verify the migration was successful:
-- SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT COUNT(*) FROM rag_vectors;
-- SELECT COUNT(*) FROM rag_documents;