-- Migration: 174_add_historical_tickets.sql
-- Creates historical_tickets table for closed/resolved ITSM tickets
-- Used as a data source for knowledge article generation
-- Written to directly by the external workflow platform during ingestion

-- ============================================================================
-- HISTORICAL TICKETS TABLE
-- Slim schema focused on knowledge generation (resolution data)
-- Same ticket can exist in both tickets and historical_tickets tables
-- ============================================================================

CREATE TABLE historical_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
    data_source_connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,
    external_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    resolution TEXT,
    external_status TEXT NOT NULL,
    source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    closed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_historical_tickets_external_id_org UNIQUE (organization_id, external_id)
);

CREATE INDEX idx_historical_tickets_cluster_id ON historical_tickets(cluster_id);
CREATE INDEX idx_historical_tickets_org_cluster ON historical_tickets(organization_id, cluster_id);

ALTER TABLE historical_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_historical_tickets" ON historical_tickets
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_historical_tickets_updated_at
    BEFORE UPDATE ON historical_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE historical_tickets IS 'Closed/resolved ITSM tickets for knowledge article generation. Written by external workflow platform.';
COMMENT ON COLUMN historical_tickets.external_id IS 'Ticket ID from ITSM system. Same ticket may also exist in tickets table.';
COMMENT ON COLUMN historical_tickets.resolution IS 'Extracted close/resolution notes from ITSM system (e.g. ServiceNow close_notes)';
COMMENT ON COLUMN historical_tickets.closed_at IS 'When the ticket was closed/resolved in the ITSM system';
COMMENT ON COLUMN historical_tickets.cluster_id IS 'NULL until classification workflow assigns cluster';
