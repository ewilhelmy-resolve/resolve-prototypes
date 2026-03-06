-- Migration: 168_add_itsm_field_mappings_trigger.sql
-- Add updated_at auto-update trigger (matches pattern used by most tables)
-- Uses DROP IF EXISTS + CREATE to be idempotent (167 may already include the trigger on fresh installs)

DROP TRIGGER IF EXISTS set_itsm_field_mappings_updated_at ON itsm_field_mappings;

CREATE TRIGGER set_itsm_field_mappings_updated_at
    BEFORE UPDATE ON itsm_field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- DROP TRIGGER IF EXISTS set_itsm_field_mappings_updated_at ON itsm_field_mappings;
