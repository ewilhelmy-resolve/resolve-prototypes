-- Migration: Add password_reset_tokens table
-- Description: Secure password reset tokens with single-use enforcement
-- Date: 2025-01-20

-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,

  CONSTRAINT token_expiry_valid CHECK (token_expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_password_reset_tokens_email ON password_reset_tokens(user_email);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(reset_token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(token_expires_at);

-- Prevent multiple active tokens per email (only one unused token at a time)
-- Note: Cannot use "token_expires_at > NOW()" because NOW() is not IMMUTABLE
-- Expired tokens will be cleaned up by opportunistic cleanup in PasswordResetService
CREATE UNIQUE INDEX idx_password_reset_tokens_unique_active_email
  ON password_reset_tokens(user_email)
  WHERE used_at IS NULL;

-- Table and column comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens with single-use enforcement and 1-hour expiration';
COMMENT ON COLUMN password_reset_tokens.reset_token IS '64-character hex token sent via email for password reset';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (single-use enforcement via atomic UPDATE)';
COMMENT ON COLUMN password_reset_tokens.token_expires_at IS 'Token expiration time (1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address of reset requester (audit trail)';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'User agent of reset requester (audit trail)';
