-- Migration: Drop iframe_tokens table and related columns
-- Token validation removed - Valkey sessionKey is now sole auth method for iframes

-- Drop the foreign key column from conversations first
ALTER TABLE conversations DROP COLUMN IF EXISTS iframe_token_id;

-- Drop the iframe_tokens table
DROP TABLE IF EXISTS iframe_tokens;
