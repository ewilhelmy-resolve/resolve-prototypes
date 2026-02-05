-- Migration: Add verification fields to data_source_connections
-- Adds columns for async verification flow: last_verification_at, last_verification_error, latest_options
-- Also adds last_sync_error field that was missing from initial migration

-- Add verification tracking fields
ALTER TABLE data_source_connections
ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_verification_error TEXT,
ADD COLUMN IF NOT EXISTS latest_options JSONB DEFAULT NULL;

-- Update column comments to reflect new functionality
COMMENT ON COLUMN data_source_connections.status IS 'Current operation status: idle (ready), verifying (checking credentials), syncing (in progress)';
COMMENT ON COLUMN data_source_connections.last_sync_error IS 'Error message from last sync operation (cleared on successful sync)';
COMMENT ON COLUMN data_source_connections.last_verification_at IS 'Timestamp of last credential verification attempt';
COMMENT ON COLUMN data_source_connections.last_verification_error IS 'Error message from last verification attempt (cleared on successful verification)';
COMMENT ON COLUMN data_source_connections.latest_options IS 'JSONB with connection-type-specific options from last successful verification (e.g., {"spaces": "ENG,PROD", "sites": "confluence.company.com"})';