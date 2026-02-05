-- Migration: Drop duplicate indexes
-- These btree indexes are redundant because UNIQUE constraints already create indexes
-- Removes unnecessary storage overhead and write performance penalty

-- pending_invitations: idx_pending_invitations_token duplicates pending_invitations_invitation_token_key
DROP INDEX IF EXISTS idx_pending_invitations_token;

-- credential_delegation_tokens: idx_cred_delegation_token duplicates credential_delegation_tokens_delegation_token_key
DROP INDEX IF EXISTS idx_cred_delegation_token;

-- pending_users: idx_pending_users_email duplicates pending_users_email_key
DROP INDEX IF EXISTS idx_pending_users_email;

-- pending_users: idx_pending_users_verification_token duplicates pending_users_verification_token_key
DROP INDEX IF EXISTS idx_pending_users_verification_token;

-- blobs: idx_blobs_digest duplicates blobs_digest_key
DROP INDEX IF EXISTS idx_blobs_digest;
