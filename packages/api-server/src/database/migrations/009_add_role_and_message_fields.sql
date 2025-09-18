-- Migration: Add role and message fields to messages table, remove original_content
-- This prepares the messages table for user/assistant role separation

-- 1. Add new fields to messages table
ALTER TABLE messages ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE messages ADD COLUMN message TEXT NOT NULL DEFAULT '';

-- 2. Migrate existing data: copy original_content to message field
UPDATE messages SET message = COALESCE(original_content, '') WHERE original_content IS NOT NULL;

-- 3. Remove the original_content column
ALTER TABLE messages DROP COLUMN original_content;

-- 4. Remove the default values now that migration is complete
ALTER TABLE messages ALTER COLUMN role DROP DEFAULT;
ALTER TABLE messages ALTER COLUMN message DROP DEFAULT;