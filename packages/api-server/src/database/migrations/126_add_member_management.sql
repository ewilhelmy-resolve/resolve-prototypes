-- Migration: Add member management support
-- Description: Adds is_active column to organization_members for status management
-- Date: 2025-10-14
-- Phase: 1.1 - Member Management Foundation

-- Add is_active column to organization_members (if not exists)
-- Default to true for all existing members
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for efficient active member queries (if not exists)
-- Used by authenticateUser middleware on every authenticated request
CREATE INDEX IF NOT EXISTS idx_organization_members_active
  ON organization_members(organization_id, is_active);

-- Rollback instructions (for reference):
-- DROP INDEX idx_organization_members_active;
-- ALTER TABLE organization_members DROP COLUMN is_active;
