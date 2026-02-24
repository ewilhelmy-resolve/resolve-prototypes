-- Migration: 165_add_autopilot_settings.sql
-- Org-level autopilot settings (1:1 per org) for dashboard metric calculations

-- ============================================================================
-- 1. AUTOPILOT_SETTINGS TABLE
-- ============================================================================

CREATE TABLE autopilot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    cost_per_ticket NUMERIC(10,2) NOT NULL DEFAULT 30.00 CHECK (cost_per_ticket > 0),
    avg_time_per_ticket_minutes INTEGER NOT NULL DEFAULT 12 CHECK (avg_time_per_ticket_minutes > 0),
    settings_json JSONB DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on organization_id already covered by UNIQUE constraint
-- Additional index for FK lookup on updated_by
CREATE INDEX idx_autopilot_settings_updated_by ON autopilot_settings(updated_by);

-- Row-Level Security
ALTER TABLE autopilot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_autopilot_settings" ON autopilot_settings
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Auto-update trigger
CREATE TRIGGER set_autopilot_settings_updated_at
    BEFORE UPDATE ON autopilot_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE autopilot_settings IS 'Org-level autopilot settings (1:1 per org) for dashboard metric calculations';
COMMENT ON COLUMN autopilot_settings.cost_per_ticket IS 'Average cost per ticket in USD, used for savings calculations';
COMMENT ON COLUMN autopilot_settings.avg_time_per_ticket_minutes IS 'Average time per ticket in minutes, used for time-saved calculations';
COMMENT ON COLUMN autopilot_settings.settings_json IS 'Overflow JSONB for future settings (freeform, no schema validation)';
COMMENT ON COLUMN autopilot_settings.updated_by IS 'Last user who modified settings';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- DROP TABLE IF EXISTS autopilot_settings CASCADE;
