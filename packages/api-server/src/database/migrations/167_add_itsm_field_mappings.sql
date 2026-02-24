-- Migration: 167_add_itsm_field_mappings.sql
-- Maps external ITSM field names to Rita's internal field names (e.g., ITSM 'urgency' → Rita 'priority')
-- One source field per target field per connection (1:1 mapping)

CREATE TABLE itsm_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_connection_id UUID NOT NULL,
    -- Denormalized for RLS org isolation (avoids join to data_source_connections)
    organization_id UUID NOT NULL,
    target_field TEXT NOT NULL,
    source_field TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NULL,
    updated_by UUID NULL,

    CONSTRAINT fk_field_mappings_data_source_connection
        FOREIGN KEY (data_source_connection_id)
        REFERENCES data_source_connections (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_field_mappings_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id)
        ON DELETE CASCADE,

    CONSTRAINT chk_field_mappings_target_field
        CHECK (target_field IN ('priority', 'status')),

    CONSTRAINT uq_field_mappings_unique_mapping
        UNIQUE (data_source_connection_id, target_field)
);

CREATE INDEX idx_field_mappings_org ON itsm_field_mappings (organization_id);

-- Auto-update updated_at
CREATE TRIGGER set_itsm_field_mappings_updated_at
    BEFORE UPDATE ON itsm_field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE itsm_field_mappings IS 'Maps external ITSM field names to Rita internal field names (1:1 per connection)';
COMMENT ON COLUMN itsm_field_mappings.organization_id IS 'Denormalized from data_source_connections for RLS org isolation';
COMMENT ON COLUMN itsm_field_mappings.target_field IS 'Rita target field: priority, status';
COMMENT ON COLUMN itsm_field_mappings.source_field IS 'Field name in external ITSM system that maps to target_field';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- DROP TRIGGER IF EXISTS set_itsm_field_mappings_updated_at ON itsm_field_mappings;
-- DROP TABLE IF EXISTS itsm_field_mappings;
