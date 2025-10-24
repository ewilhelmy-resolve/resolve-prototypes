-- Add source column to blob_metadata table
-- Tracks the origin of documents: manual upload, confluence, servicenow, sharepoint, websearch

ALTER TABLE blob_metadata
ADD COLUMN source TEXT;

-- Add index for filtering by source
CREATE INDEX idx_blob_metadata_source ON blob_metadata (source);

-- Add comment for documentation
COMMENT ON COLUMN blob_metadata.source IS 'Data source origin: manual (uploaded), confluence, servicenow, sharepoint, websearch. NULL if unknown.';
