-- Migration: 138_add_autopilot_tables.sql
-- Creates database schema for RITA Autopilot feature
-- Tables: clusters, tickets, analytics_cluster_daily, knowledge_articles, ingestion_runs, credential_delegation_tokens

-- ============================================================================
-- 1. CLUSTERS TABLE
-- AI-generated ticket groupings from Workflow Platform
-- ============================================================================

CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_cluster_id TEXT NOT NULL,
    name TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    validation_target INTEGER,  -- TBD: nullable until product spec finalized
    validation_current INTEGER NOT NULL DEFAULT 0,
    kb_status TEXT DEFAULT 'PENDING' CHECK (kb_status IN ('PENDING', 'FOUND', 'GAP')),
    automation_enabled_by UUID REFERENCES user_profiles(user_id),
    automation_enabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_clusters_external_id_org UNIQUE (organization_id, external_cluster_id)
);

CREATE INDEX idx_clusters_organization_id ON clusters(organization_id);
CREATE INDEX idx_clusters_external_cluster_id ON clusters(external_cluster_id);
CREATE INDEX idx_clusters_kb_status ON clusters(kb_status);
CREATE INDEX idx_clusters_created_at ON clusters(created_at DESC);

ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_clusters" ON clusters
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_clusters_updated_at
    BEFORE UPDATE ON clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE clusters IS 'AI-generated ticket groupings from Workflow Platform';
COMMENT ON COLUMN clusters.external_cluster_id IS 'Stable ID from Workflow Platform for idempotent upsert';
COMMENT ON COLUMN clusters.validation_target IS 'Target validated tickets to enable automation (TBD)';
COMMENT ON COLUMN clusters.kb_status IS 'Knowledge base coverage: PENDING (checking), FOUND (has KB), GAP (missing KB)';

-- ============================================================================
-- 2. TICKETS TABLE
-- ITSM tickets assigned to clusters
-- ============================================================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    data_source_connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,
    external_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    external_status TEXT NOT NULL,
    rita_status TEXT DEFAULT 'NEEDS_RESPONSE' CHECK (rita_status IN ('NEEDS_RESPONSE', 'COMPLETED')),
    is_validation_sample BOOLEAN DEFAULT false,
    validation_result TEXT DEFAULT 'PENDING' CHECK (validation_result IN ('PENDING', 'APPROVED', 'REJECTED')),
    validated_by UUID REFERENCES user_profiles(user_id),
    validated_at TIMESTAMP WITH TIME ZONE,
    source_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_tickets_external_id_org UNIQUE (organization_id, external_id)
);

CREATE INDEX idx_tickets_organization_id ON tickets(organization_id);
CREATE INDEX idx_tickets_cluster_id ON tickets(cluster_id);
CREATE INDEX idx_tickets_external_id ON tickets(external_id);
CREATE INDEX idx_tickets_rita_status ON tickets(rita_status);
CREATE INDEX idx_tickets_validation_result ON tickets(validation_result);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_tickets" ON tickets
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tickets IS 'ITSM tickets assigned to clusters from Workflow Platform';
COMMENT ON COLUMN tickets.external_id IS 'Ticket ID from ITSM system (Jira/ServiceNow)';
COMMENT ON COLUMN tickets.rita_status IS 'Rita processing status: NEEDS_RESPONSE or COMPLETED';
COMMENT ON COLUMN tickets.is_validation_sample IS 'Whether ticket is selected for human validation';

-- ============================================================================
-- 3. ANALYTICS_CLUSTER_DAILY TABLE
-- Pre-aggregated daily metrics for dashboard
-- ============================================================================

CREATE TABLE analytics_cluster_daily (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    total_tickets INTEGER DEFAULT 0,
    automated_count INTEGER DEFAULT 0,
    kb_gap_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (organization_id, cluster_id, day)
);

CREATE INDEX idx_analytics_cluster_daily_org ON analytics_cluster_daily(organization_id);
CREATE INDEX idx_analytics_cluster_daily_day ON analytics_cluster_daily(day DESC);
CREATE INDEX idx_analytics_cluster_daily_cluster ON analytics_cluster_daily(cluster_id);

ALTER TABLE analytics_cluster_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_analytics" ON analytics_cluster_daily
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_analytics_updated_at
    BEFORE UPDATE ON analytics_cluster_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE analytics_cluster_daily IS 'Pre-aggregated daily metrics per cluster for dashboard performance';

-- ============================================================================
-- 4. KNOWLEDGE_ARTICLES TABLE
-- KB articles linked to clusters (system-generated from Workflow Platform)
-- ============================================================================

CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    relevance_score FLOAT NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'broken', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, external_id)
);

CREATE INDEX idx_knowledge_articles_organization_id ON knowledge_articles(organization_id);
CREATE INDEX idx_knowledge_articles_cluster_id ON knowledge_articles(cluster_id);
CREATE INDEX idx_knowledge_articles_status ON knowledge_articles(status);
CREATE INDEX idx_knowledge_articles_relevance ON knowledge_articles(relevance_score DESC);

ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_knowledge" ON knowledge_articles
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_knowledge_articles_updated_at
    BEFORE UPDATE ON knowledge_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE knowledge_articles IS 'KB articles linked to clusters (system-generated from Workflow Platform)';
COMMENT ON COLUMN knowledge_articles.external_id IS 'Stable identifier from Workflow Platform for idempotent upsert';
COMMENT ON COLUMN knowledge_articles.relevance_score IS 'AI relevance score (0.0 to 1.0) from Workflow Platform';

-- ============================================================================
-- 5. INGESTION_RUNS TABLE
-- Track ticket ingestion/sync operations
-- ============================================================================

CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_source_connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,
    started_by UUID NOT NULL REFERENCES user_profiles(user_id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ingestion_runs_organization_id ON ingestion_runs(organization_id);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);
CREATE INDEX idx_ingestion_runs_started_by ON ingestion_runs(started_by);
CREATE INDEX idx_ingestion_runs_created_at ON ingestion_runs(created_at DESC);

ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_ingestion_runs" ON ingestion_runs
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_ingestion_runs_updated_at
    BEFORE UPDATE ON ingestion_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ingestion_runs IS 'Track ticket ingestion/sync operations initiated by users';
COMMENT ON COLUMN ingestion_runs.started_by IS 'User who triggered the sync (required - always user-initiated)';

-- ============================================================================
-- 6. CREDENTIAL_DELEGATION_TOKENS TABLE
-- Delegated ITSM credential setup tokens
-- ============================================================================

CREATE TABLE credential_delegation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    itsm_system_type TEXT NOT NULL CHECK (itsm_system_type IN ('servicenow', 'jira', 'confluence')),
    delegation_token TEXT NOT NULL UNIQUE,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'verified', 'expired', 'cancelled')),
    credentials_received_at TIMESTAMP WITH TIME ZONE,
    credentials_verified_at TIMESTAMP WITH TIME ZONE,
    last_verification_error TEXT,
    connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cred_delegation_email ON credential_delegation_tokens(admin_email);
CREATE INDEX idx_cred_delegation_token ON credential_delegation_tokens(delegation_token);
CREATE INDEX idx_cred_delegation_org_id ON credential_delegation_tokens(organization_id);
CREATE INDEX idx_cred_delegation_status ON credential_delegation_tokens(status);
CREATE INDEX idx_cred_delegation_expires_at ON credential_delegation_tokens(token_expires_at);
CREATE INDEX idx_cred_delegation_created_by ON credential_delegation_tokens(created_by_user_id);
CREATE INDEX idx_cred_delegation_connection_id ON credential_delegation_tokens(connection_id);

-- Unique partial index: one pending delegation per admin+org+system
CREATE UNIQUE INDEX idx_cred_delegation_pending_unique
    ON credential_delegation_tokens(admin_email, organization_id, itsm_system_type)
    WHERE status = 'pending';

ALTER TABLE credential_delegation_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_delegations" ON credential_delegation_tokens
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

COMMENT ON TABLE credential_delegation_tokens IS 'Delegated ITSM credential setup flow tokens';
COMMENT ON COLUMN credential_delegation_tokens.delegation_token IS 'Unique token sent to IT admin for credential submission';
COMMENT ON COLUMN credential_delegation_tokens.status IS 'Token lifecycle: pending -> used -> verified (or expired/cancelled)';

-- =============================================================================
-- ROLLBACK SCRIPT (If migration needs to be reverted)
-- =============================================================================
--
-- To rollback this migration, run:
--
-- DROP TABLE IF EXISTS credential_delegation_tokens CASCADE;
-- DROP TABLE IF EXISTS knowledge_articles CASCADE;
-- DROP TABLE IF EXISTS analytics_cluster_daily CASCADE;
-- DROP TABLE IF EXISTS ingestion_runs CASCADE;
-- DROP TABLE IF EXISTS tickets CASCADE;
-- DROP TABLE IF EXISTS clusters CASCADE;
