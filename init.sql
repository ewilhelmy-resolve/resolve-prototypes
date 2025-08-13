-- PostgreSQL initialization script for Resolve Onboarding

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    tier VARCHAR(50) DEFAULT 'standard',
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table for IT service management
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(20),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_time_minutes INTEGER,
    cost_saved DECIMAL(10,2),
    assigned_to VARCHAR(255),
    resolved_by VARCHAR(255),
    is_automated BOOLEAN DEFAULT FALSE,
    automation_type VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual',
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE
);

-- CSV uploads tracking
CREATE TABLE IF NOT EXISTS csv_uploads (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    data TEXT NOT NULL,
    size INTEGER,
    line_count INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

-- Sessions for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys for tenant isolation
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    rate_limit INTEGER DEFAULT 1000
);

-- API request logging
CREATE TABLE IF NOT EXISTS api_requests (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    query_params TEXT,
    response_status INTEGER,
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER
);

-- Integration configurations
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    config JSONB,
    status VARCHAR(50) DEFAULT 'active',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, type)
);

-- Pending validations for async integration checks
CREATE TABLE IF NOT EXISTS pending_validations (
    id SERIAL PRIMARY KEY,
    webhook_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    integration_type VARCHAR(100) NOT NULL,
    config JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Integration sync history
CREATE TABLE IF NOT EXISTS integrations_data (
    id SERIAL PRIMARY KEY,
    integration_type VARCHAR(100) NOT NULL,
    last_sync TIMESTAMP,
    tickets_imported INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(100) NOT NULL,
    event_data JSONB,
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding funnel tracking
CREATE TABLE IF NOT EXISTS onboarding_funnel (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    step_name VARCHAR(100) NOT NULL,
    step_number INTEGER,
    time_spent_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    abandoned BOOLEAN DEFAULT FALSE,
    abandoned_reason TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Page metrics
CREATE TABLE IF NOT EXISTS page_metrics (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    page_path VARCHAR(500) NOT NULL,
    time_on_page_seconds INTEGER,
    scroll_depth_percent INTEGER,
    clicks_count INTEGER,
    form_interactions INTEGER,
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP
);

-- Conversion tracking
CREATE TABLE IF NOT EXISTS conversions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    conversion_type VARCHAR(100) NOT NULL,
    conversion_value DECIMAL(10,2),
    source VARCHAR(100),
    medium VARCHAR(100),
    campaign VARCHAR(100),
    tier_selected VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook calls tracking
CREATE TABLE IF NOT EXISTS webhook_calls (
    id SERIAL PRIMARY KEY,
    upload_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    request_payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    called_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created ON tickets(created_at);
CREATE INDEX idx_tickets_user ON tickets(user_email);
CREATE INDEX idx_api_keys_key ON api_keys(key_hash);
CREATE INDEX idx_api_keys_email ON api_keys(user_email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_user ON analytics_events(user_email);
CREATE INDEX idx_funnel_session ON onboarding_funnel(session_id);
CREATE INDEX idx_conversions_session ON conversions(session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user
INSERT INTO users (email, password, company_name, tier) 
VALUES ('john@resolve.io', '!Password1', 'Resolve Demo', 'premium')
ON CONFLICT (email) DO NOTHING;