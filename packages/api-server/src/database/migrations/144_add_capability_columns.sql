-- Migration: Add capability columns to data_source_connections
-- Purpose: Enable dual-purpose data sources (KB + ITSM)
-- ServiceNow can serve both KB articles and ITSM tickets

-- Add capability columns
ALTER TABLE data_source_connections
  ADD COLUMN IF NOT EXISTS kb_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS itsm_enabled BOOLEAN DEFAULT false;

-- Set defaults based on existing types
-- Confluence and SharePoint are KB sources
UPDATE data_source_connections
SET kb_enabled = true
WHERE type IN ('confluence', 'sharepoint');

-- ServiceNow defaults to KB (existing behavior)
UPDATE data_source_connections
SET kb_enabled = true
WHERE type = 'servicenow';

-- Jira is ITSM only
UPDATE data_source_connections
SET itsm_enabled = true
WHERE type = 'jira';

-- Comments
COMMENT ON COLUMN data_source_connections.kb_enabled IS 'Source provides knowledge articles for RAG';
COMMENT ON COLUMN data_source_connections.itsm_enabled IS 'Source provides tickets for autopilot clustering';
