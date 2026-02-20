-- Migration: 168_add_itsm_field_mappings_trigger.sql
-- Add updated_at auto-update trigger (matches pattern used by most tables)

CREATE TRIGGER set_itsm_field_mappings_updated_at
    BEFORE UPDATE ON itsm_field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- DROP TRIGGER IF EXISTS set_itsm_field_mappings_updated_at ON itsm_field_mappings;
