-- Create system configuration table for storing app-wide settings
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration values
INSERT INTO system_config (key, value, description)
VALUES 
    ('app_url', 'http://localhost:5000', 'Base URL for the application callbacks'),
    ('webhook_enabled', 'true', 'Enable/disable webhook functionality'),
    ('max_document_size', '51200', 'Maximum document size for RAG in bytes'),
    ('vector_dimension', '1536', 'Vector dimension for embeddings')
ON CONFLICT (key) DO NOTHING;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);