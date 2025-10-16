-- Migration: Add first_name and last_name to user_profiles
-- Purpose: Store user names from Keycloak JWT token for better UX and editability
-- Author: Claude Code
-- Date: 2025-10-15

-- Add first_name and last_name columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.first_name IS 'User first name from Keycloak JWT token (given_name claim)';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name from Keycloak JWT token (family_name claim)';

-- Add composite index for searching/filtering by names
CREATE INDEX idx_user_profiles_names ON user_profiles(last_name, first_name);
