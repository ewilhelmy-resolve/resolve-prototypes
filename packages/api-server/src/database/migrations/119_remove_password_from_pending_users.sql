-- Remove password column from pending_users table
-- Passwords should never be stored, even temporarily
-- The webhook receives the password directly without database storage

-- Remove the password column
ALTER TABLE pending_users DROP COLUMN IF EXISTS password;

COMMENT ON TABLE pending_users IS 'Stores users who have signed up but not yet verified their email address. Passwords are sent directly to external service via webhook and never stored.';
