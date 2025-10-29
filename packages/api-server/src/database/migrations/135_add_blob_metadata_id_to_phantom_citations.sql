-- Add blob_metadata_id column to support new citation format
-- Keep existing blob_id column for backward compatibility with old messages
--
-- Migration Strategy: Dual-column approach
-- - New citations use blob_metadata_id (blob_metadata.id from blob_metadata table)
-- - Legacy citations use blob_id (blob_id from blobs table)
-- - Both columns nullable, but at least one must be provided

-- Add new column for blob_metadata.id references
ALTER TABLE phantom_citations
ADD COLUMN blob_metadata_id UUID NULL;

-- Update table and column comments for documentation
COMMENT ON TABLE phantom_citations IS 'Tracks citations that returned 404 errors. Supports both legacy blob_id and new blob_metadata_id formats for backward compatibility.';
COMMENT ON COLUMN phantom_citations.blob_metadata_id IS 'The blob_metadata.id that was requested but not found (new format, preferred)';
COMMENT ON COLUMN phantom_citations.blob_id IS 'The blob_id that was requested but not found (legacy format, backward compatibility)';

-- Drop old unique constraint (doesn't handle NULL values properly)
DROP INDEX idx_phantom_citations_unique;

-- Create separate unique indexes for each ID type (handles NULL values properly)
-- PostgreSQL partial indexes ignore NULL values, so each index only enforces uniqueness for its ID type
CREATE UNIQUE INDEX idx_phantom_citations_unique_blob_id
ON phantom_citations (blob_id, user_id, organization_id)
WHERE blob_id IS NOT NULL;

CREATE UNIQUE INDEX idx_phantom_citations_unique_metadata_id
ON phantom_citations (blob_metadata_id, user_id, organization_id)
WHERE blob_metadata_id IS NOT NULL;

-- Add index for new blob_metadata_id lookups (query performance)
CREATE INDEX idx_phantom_citations_blob_metadata_id ON phantom_citations (blob_metadata_id);

-- Add check constraint to ensure at least one ID is provided
ALTER TABLE phantom_citations
ADD CONSTRAINT chk_phantom_citations_has_id
CHECK (blob_id IS NOT NULL OR blob_metadata_id IS NOT NULL);
