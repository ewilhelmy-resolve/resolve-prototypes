-- Migration: Add missing indexes on foreign key columns
-- Improves DELETE cascade performance and JOIN operations

-- user_profiles: active_organization_id references organizations(id)
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_org ON user_profiles(active_organization_id);

-- pending_invitations: invited_by_user_id references user_profiles(user_id)
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invited_by ON pending_invitations(invited_by_user_id);

-- tickets: data_source_connection_id references data_source_connections(id)
CREATE INDEX IF NOT EXISTS idx_tickets_data_source_conn ON tickets(data_source_connection_id);

-- ingestion_runs: data_source_connection_id references data_source_connections(id)
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_data_source_conn ON ingestion_runs(data_source_connection_id);
