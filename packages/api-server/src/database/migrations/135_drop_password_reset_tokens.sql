-- Migration: Drop password_reset_tokens table
-- Description: Remove custom password reset tokens table (password reset now handled by Keycloak)
-- Date: 2025-10-29
-- Related: Migration 129 (add), commits 6bad9c2 (implementation), ad6683c (fix)
-- Reason: Password reset now handled by Keycloak's native forgot password flow with Rita branding

-- Drop indexes first
DROP INDEX IF EXISTS idx_password_reset_tokens_unique_active_email;
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS idx_password_reset_tokens_token;
DROP INDEX IF EXISTS idx_password_reset_tokens_email;

-- Drop table
DROP TABLE IF EXISTS password_reset_tokens;

