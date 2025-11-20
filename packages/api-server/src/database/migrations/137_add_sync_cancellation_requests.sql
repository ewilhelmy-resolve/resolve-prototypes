-- Migration: Add sync_cancellation_requests table
-- Description: Track sync cancellation requests for platform team to process
-- Date: 2025-11-19

-- Create sync_cancellation_requests table
CREATE TABLE IF NOT EXISTS sync_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  connection_id UUID NOT NULL,
  connection_type TEXT NOT NULL,
  connection_url TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE sync_cancellation_requests IS 'Queue of sync cancellation requests for external platform to process';
COMMENT ON COLUMN sync_cancellation_requests.tenant_id IS 'Organization that owns the connection';
COMMENT ON COLUMN sync_cancellation_requests.user_id IS 'User who requested the cancellation';
COMMENT ON COLUMN sync_cancellation_requests.connection_id IS 'Data source connection to cancel';
COMMENT ON COLUMN sync_cancellation_requests.connection_type IS 'Type of connection (confluence, servicenow, etc)';
COMMENT ON COLUMN sync_cancellation_requests.connection_url IS 'Connection URL from settings';
COMMENT ON COLUMN sync_cancellation_requests.email IS 'Email from connection settings';
COMMENT ON COLUMN sync_cancellation_requests.status IS 'Processing status: pending, processing, completed';

-- Add indexes
CREATE INDEX idx_sync_cancel_tenant ON sync_cancellation_requests(tenant_id);
CREATE INDEX idx_sync_cancel_status ON sync_cancellation_requests(status);
CREATE INDEX idx_sync_cancel_connection ON sync_cancellation_requests(connection_id);
CREATE INDEX idx_sync_cancel_created ON sync_cancellation_requests(created_at);
