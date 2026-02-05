-- Add pending_users table for signup flow
-- Users remain in this table until email verification is completed

CREATE TABLE pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  password TEXT NOT NULL,
  verification_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pending_users_email ON pending_users(email);
CREATE INDEX idx_pending_users_verification_token ON pending_users(verification_token);
CREATE INDEX idx_pending_users_token_expires_at ON pending_users(token_expires_at);

COMMENT ON TABLE pending_users IS 'Stores users who have signed up but not yet verified their email address';
COMMENT ON COLUMN pending_users.verification_token IS 'Unique token sent via email for account verification';
COMMENT ON COLUMN pending_users.token_expires_at IS 'Expiration time for the verification token';