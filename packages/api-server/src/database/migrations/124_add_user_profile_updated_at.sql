-- Migration: Add updated_at column to user_profiles
-- Purpose: Track when user profile was last modified
-- Author: Claude Code
-- Date: 2025-10-15

-- Add updated_at column to track profile changes
ALTER TABLE user_profiles
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN user_profiles.updated_at IS 'Last profile update timestamp';
