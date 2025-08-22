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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Insert default admin users if not exist
INSERT INTO users (email, password, full_name, company_name, tier)
VALUES ('admin@resolve.io', 'admin123', 'Admin User', 'Resolve', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, full_name, company_name, tier)
VALUES ('john.gorham@resolve.io', 'ResolveAdmin2024!', 'John Gorham', 'Resolve.io', 'admin')
ON CONFLICT (email) DO NOTHING;