-- Migration: 166_fix_autopilot_settings.sql
-- Fix settings_json nullable inconsistency and updated_by missing ON DELETE

-- 1. Make settings_json NOT NULL (already defaults to '{}', no NULLs exist)
UPDATE autopilot_settings SET settings_json = '{}'::jsonb WHERE settings_json IS NULL;
ALTER TABLE autopilot_settings ALTER COLUMN settings_json SET NOT NULL;

-- 2. Fix updated_by FK to SET NULL on user deletion
ALTER TABLE autopilot_settings DROP CONSTRAINT IF EXISTS autopilot_settings_updated_by_fkey;
ALTER TABLE autopilot_settings
    ADD CONSTRAINT autopilot_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- ALTER TABLE autopilot_settings DROP CONSTRAINT IF EXISTS autopilot_settings_updated_by_fkey;
-- ALTER TABLE autopilot_settings
--     ADD CONSTRAINT autopilot_settings_updated_by_fkey
--     FOREIGN KEY (updated_by) REFERENCES user_profiles(user_id);
-- ALTER TABLE autopilot_settings ALTER COLUMN settings_json DROP NOT NULL;
