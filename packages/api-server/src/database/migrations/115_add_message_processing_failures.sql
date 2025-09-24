-- Migration 115: Add message processing failures table
-- This migration creates a table to track messages that failed to process from queues

-- Create message_processing_failures table (idempotent)
CREATE TABLE IF NOT EXISTS message_processing_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    message_id UUID NOT NULL,
    queue_name VARCHAR(100) NOT NULL,
    message_payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    error_type VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'failed',
    original_received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_message_failures_tenant ON message_processing_failures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_failures_queue ON message_processing_failures(queue_name);
CREATE INDEX IF NOT EXISTS idx_message_failures_status ON message_processing_failures(processing_status);
CREATE INDEX IF NOT EXISTS idx_message_failures_retry ON message_processing_failures(next_retry_at) WHERE processing_status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_message_failures_created ON message_processing_failures(created_at DESC);

-- Add trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_message_failures_updated_at ON message_processing_failures;
CREATE TRIGGER update_message_failures_updated_at BEFORE UPDATE ON message_processing_failures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE message_processing_failures IS 'Tracks messages that failed to process from RabbitMQ queues';
COMMENT ON COLUMN message_processing_failures.tenant_id IS 'UUID of the tenant associated with the message (NULL if tenant cannot be determined)';
COMMENT ON COLUMN message_processing_failures.message_id IS 'Unique identifier of the failed message';
COMMENT ON COLUMN message_processing_failures.queue_name IS 'Name of the queue the message came from';
COMMENT ON COLUMN message_processing_failures.message_payload IS 'Original message content as JSON';
COMMENT ON COLUMN message_processing_failures.error_message IS 'Detailed error message from processing failure';
COMMENT ON COLUMN message_processing_failures.error_type IS 'Category of error (validation, timeout, database, etc.)';
COMMENT ON COLUMN message_processing_failures.retry_count IS 'Number of times processing has been retried';
COMMENT ON COLUMN message_processing_failures.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN message_processing_failures.next_retry_at IS 'When the next retry attempt should occur';
COMMENT ON COLUMN message_processing_failures.processing_status IS 'Current status: failed, retrying, dead_letter, resolved';
COMMENT ON COLUMN message_processing_failures.original_received_at IS 'When the message was originally received from the queue';