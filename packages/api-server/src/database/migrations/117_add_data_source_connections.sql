-- Migration: Add data source connections
-- Enables organizations to configure external data sources (Confluence, ServiceNow, SharePoint, Web Search)
-- without storing credentials in Rita

-- Create data_source_connections table
CREATE TABLE data_source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status TEXT DEFAULT 'idle' NOT NULL, -- 'idle', 'syncing'
  last_sync_status TEXT DEFAULT NULL, -- NULL, 'completed', 'failed'
  last_sync_at TIMESTAMP WITH TIME ZONE,

  -- Control
  enabled BOOLEAN DEFAULT false,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES user_profiles(user_id),
  updated_by UUID NOT NULL REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_org_data_source UNIQUE (organization_id, type)
);

-- Create indexes
CREATE INDEX idx_data_source_connections_org ON data_source_connections (organization_id);
CREATE INDEX idx_data_source_connections_type ON data_source_connections (type);
CREATE INDEX idx_data_source_connections_enabled ON data_source_connections (enabled);
CREATE INDEX idx_data_source_connections_status ON data_source_connections (status);

-- Add comments for documentation
COMMENT ON TABLE data_source_connections IS 'External data source configurations (no credentials stored)';
COMMENT ON COLUMN data_source_connections.type IS 'Data source type: confluence, servicenow, sharepoint, websearch';
COMMENT ON COLUMN data_source_connections.settings IS 'JSONB settings specific to each data source type (no credentials)';
COMMENT ON COLUMN data_source_connections.status IS 'Current operation status: idle (ready), syncing (in progress)';
COMMENT ON COLUMN data_source_connections.last_sync_status IS 'Last sync result: NULL (never synced), completed, failed';
COMMENT ON COLUMN data_source_connections.enabled IS 'Whether the data source is configured and active';