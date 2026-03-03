-- Migration: 169_add_value_mapping_to_itsm_field_mappings.sql
-- Convert itsm_field_mappings from field-name mapping to value mapping
-- Renames: target_field → field_name, source_field → source_value
-- Adds: target_value column (NOT NULL)
-- Updates unique constraint to (data_source_connection_id, field_name, source_value)

-- 1. Rename columns
ALTER TABLE itsm_field_mappings RENAME COLUMN target_field TO field_name;
ALTER TABLE itsm_field_mappings RENAME COLUMN source_field TO source_value;

-- 2. Add target_value column (default empty string temporarily for existing rows)
ALTER TABLE itsm_field_mappings ADD COLUMN target_value TEXT NOT NULL DEFAULT '';

-- Remove the default after migration (column should require explicit values going forward)
ALTER TABLE itsm_field_mappings ALTER COLUMN target_value DROP DEFAULT;

-- 3. Drop old CHECK and unique constraints, recreate with new column names
ALTER TABLE itsm_field_mappings DROP CONSTRAINT IF EXISTS chk_field_mappings_target_field;
ALTER TABLE itsm_field_mappings ADD CONSTRAINT chk_field_mappings_field_name
    CHECK (field_name IN ('priority', 'status'));

ALTER TABLE itsm_field_mappings DROP CONSTRAINT IF EXISTS uq_field_mappings_unique_mapping;
ALTER TABLE itsm_field_mappings ADD CONSTRAINT uq_field_mappings_unique_mapping
    UNIQUE (data_source_connection_id, field_name, source_value);

-- 4. Update comments
COMMENT ON COLUMN itsm_field_mappings.field_name IS 'Rita field being mapped: priority, status';
COMMENT ON COLUMN itsm_field_mappings.source_value IS 'Value from external ITSM system (e.g., 1 - Critical)';
COMMENT ON COLUMN itsm_field_mappings.target_value IS 'Mapped Rita value (e.g., Critical)';
COMMENT ON TABLE itsm_field_mappings IS 'Maps external ITSM field values to Rita internal values (many-to-one per field per connection)';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- ALTER TABLE itsm_field_mappings DROP CONSTRAINT IF EXISTS uq_field_mappings_unique_mapping;
-- ALTER TABLE itsm_field_mappings DROP CONSTRAINT IF EXISTS chk_field_mappings_field_name;
-- ALTER TABLE itsm_field_mappings DROP COLUMN target_value;
-- ALTER TABLE itsm_field_mappings RENAME COLUMN source_value TO source_field;
-- ALTER TABLE itsm_field_mappings RENAME COLUMN field_name TO target_field;
-- ALTER TABLE itsm_field_mappings ADD CONSTRAINT chk_field_mappings_target_field
--     CHECK (target_field IN ('priority', 'status'));
-- ALTER TABLE itsm_field_mappings ADD CONSTRAINT uq_field_mappings_unique_mapping
--     UNIQUE (data_source_connection_id, target_field);
