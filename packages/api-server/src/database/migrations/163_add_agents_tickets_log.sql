-- Migration: 163_add_agents_tickets_log.sql
-- Adds agents table (global ITSM agents) and tickets_log (ticket lifecycle events)

-- ============================================================================
-- 1. AGENTS TABLE (global, no org scope)
-- External ITSM agents shared across all organizations
-- ============================================================================

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agents IS 'External ITSM agents (global, shared across orgs)';

-- ============================================================================
-- 2. TICKETS_LOG TABLE
-- Ticket lifecycle event log
-- ============================================================================

CREATE TABLE tickets_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'ingested',
    agent_id UUID REFERENCES agents(id) ON DELETE RESTRICT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tickets_log_ticket_id_event_date ON tickets_log(ticket_id, event_date DESC);
CREATE INDEX idx_tickets_log_agent_id ON tickets_log(agent_id);
CREATE INDEX idx_tickets_log_event_type ON tickets_log(event_type);

CREATE TRIGGER set_tickets_log_updated_at
    BEFORE UPDATE ON tickets_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tickets_log IS 'Ticket lifecycle event log';
COMMENT ON COLUMN tickets_log.event_date IS 'When event occurred in external ITSM platform';
COMMENT ON COLUMN tickets_log.event_type IS 'Event types: ingested, clustered, agent_start, agent_end, agent_fail, user_recluster';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- DROP TABLE IF EXISTS tickets_log CASCADE;
-- DROP TABLE IF EXISTS agents CASCADE;
