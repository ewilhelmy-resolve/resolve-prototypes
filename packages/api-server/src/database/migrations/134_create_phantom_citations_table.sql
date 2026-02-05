-- Create phantom_citations table to track 404 citation errors
-- Records when citations reference non-existent documents (blob_id not found)

CREATE TABLE phantom_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicate entries (blob_id + user_id + organization_id)
CREATE UNIQUE INDEX idx_phantom_citations_unique ON phantom_citations (blob_id, user_id, organization_id);

-- Index for querying by user
CREATE INDEX idx_phantom_citations_user_id ON phantom_citations (user_id);

-- Index for querying by organization
CREATE INDEX idx_phantom_citations_organization_id ON phantom_citations (organization_id);

-- Index for querying by last_seen (for cleanup queries)
CREATE INDEX idx_phantom_citations_last_seen ON phantom_citations (last_seen);

-- Add comments for documentation
COMMENT ON TABLE phantom_citations IS 'Tracks citations that returned 404 errors (non-existent blob_id references)';
COMMENT ON COLUMN phantom_citations.blob_id IS 'The blob_id that was requested but not found (phantom citation)';
COMMENT ON COLUMN phantom_citations.first_seen IS 'When this phantom citation was first encountered';
COMMENT ON COLUMN phantom_citations.last_seen IS 'When this phantom citation was most recently encountered';
COMMENT ON COLUMN phantom_citations.occurrence_count IS 'Number of times this phantom citation has been requested';
