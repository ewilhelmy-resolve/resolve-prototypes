-- Migration: Add iframe_tokens table for iframe authentication
-- Tokens are used to authenticate iframe integrations

CREATE TABLE IF NOT EXISTS iframe_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_iframe_tokens_token ON iframe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_iframe_tokens_active ON iframe_tokens(is_active) WHERE is_active = true;

-- Seed default dev token
INSERT INTO iframe_tokens (id, token, name, description, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    'dev-iframe-token-2024',
    'Development Token',
    'Default token for local development and testing',
    true
) ON CONFLICT (token) DO NOTHING;
