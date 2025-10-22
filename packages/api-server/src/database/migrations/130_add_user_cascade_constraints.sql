-- Migration 130: Add Missing Foreign Key Constraints for User Deletion
-- Purpose: Enable proper CASCADE deletion to prevent orphaned data
-- Phase: Phase 2 - Hard Delete Implementation
-- Risk: LOW - Only adds constraints, does not modify data
-- Date: 2025-10-21
--
-- Note: PostgreSQL will automatically validate that all existing foreign key
-- references are valid. If orphaned records exist, the migration will fail
-- with a clear error message indicating which records are problematic.

-- =============================================================================
-- STEP 1: Add Foreign Key Constraints with CASCADE
-- =============================================================================

-- 1. Messages table: CASCADE delete when user is deleted
ALTER TABLE messages
ADD CONSTRAINT fk_messages_user_id
FOREIGN KEY (user_id)
REFERENCES user_profiles(user_id)
ON DELETE CASCADE;

-- 2. Conversations table: CASCADE delete when user (creator) is deleted
ALTER TABLE conversations
ADD CONSTRAINT fk_conversations_user_id
FOREIGN KEY (user_id)
REFERENCES user_profiles(user_id)
ON DELETE CASCADE;

-- 3. Blob metadata table: CASCADE delete when user (uploader) is deleted
ALTER TABLE blob_metadata
ADD CONSTRAINT fk_blob_metadata_user_id
FOREIGN KEY (user_id)
REFERENCES user_profiles(user_id)
ON DELETE CASCADE;

-- 4. Organization members table: CASCADE delete when user is deleted
-- CRITICAL: This prevents orphaned membership records when users are deleted
ALTER TABLE organization_members
ADD CONSTRAINT fk_organization_members_user_id
FOREIGN KEY (user_id)
REFERENCES user_profiles(user_id)
ON DELETE CASCADE;

-- 5. Audit logs table: SET NULL on user deletion (preserve audit trail)
-- Note: audit_logs.user_id is nullable, so SET NULL is appropriate
ALTER TABLE audit_logs
ADD CONSTRAINT fk_audit_logs_user_id
FOREIGN KEY (user_id)
REFERENCES user_profiles(user_id)
ON DELETE SET NULL;

-- =============================================================================
-- STEP 2: Create Indexes for Performance (if not exist)
-- =============================================================================

-- Speed up FK constraint checking during deletions
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Note: blob_metadata.user_id already has an index from migration 113

-- =============================================================================
-- ROLLBACK SCRIPT (If migration needs to be reverted)
-- =============================================================================

-- To rollback this migration, run:
--
-- ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_user_id CASCADE;
-- ALTER TABLE conversations DROP CONSTRAINT IF EXISTS fk_conversations_user_id CASCADE;
-- ALTER TABLE blob_metadata DROP CONSTRAINT IF EXISTS fk_blob_metadata_user_id CASCADE;
-- ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_organization_members_user_id CASCADE;
-- ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_audit_logs_user_id CASCADE;
--
-- Note: Indexes can remain as they improve query performance regardless
