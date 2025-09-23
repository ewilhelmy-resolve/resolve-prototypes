-- Add content-addressable storage tables: blobs and blob_metadata
-- This migration adds the new schema alongside existing documents table
-- for gradual migration to the new content-addressable storage system

-- ----------------------------------------------------------------
-- Table 1: `blobs`
-- Stores the raw, deduplicated file content (the "data").
-- This table is content-addressable via the `digest`.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blobs (
    -- A simple, auto-incrementing primary key for efficient joins.
    blob_id SERIAL PRIMARY KEY,

    -- The actual binary data of the file.
    data BYTEA NOT NULL,

    -- A unique hash (e.g., SHA-256) of the `data`.
    -- The UNIQUE constraint is the key to preventing data duplication.
    digest TEXT UNIQUE NOT NULL
);

-- An index on the digest is crucial for fast lookups to check for existence.
CREATE INDEX IF NOT EXISTS idx_blobs_digest ON blobs(digest);


-- ----------------------------------------------------------------
-- Table 2: `blob_metadata`
-- Stores all the contextual information about a blob (the "metadata").
-- This is what the application will primarily interact with as a "document".
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blob_metadata (
    -- A unique identifier for each metadata entry.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key linking this metadata to the actual content in the `blobs` table.
    blob_id INTEGER NOT NULL REFERENCES blobs(blob_id) ON DELETE CASCADE,

    -- === DEDICATED COLUMNS (For Structured & Frequently Queried Data) ===

    -- Ownership and relational information.
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- The user who uploaded or owns this instance.

    -- Core file properties, essential for application logic and display.
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- Size in bytes.
    mime_type TEXT NOT NULL,

    -- Application-specific state for processing pipelines.
    status TEXT DEFAULT 'uploaded' NOT NULL, -- e.g., 'uploaded', 'processing', 'processed', 'failed'
    processed_markdown TEXT, -- Can store the output from a RAG pipeline.

    -- === JSONB COLUMN (For Flexible and Unstructured Data) ===
    -- For storing dynamic, optional, or complex nested data like custom tags,
    -- descriptions, or properties extracted from the file.
    metadata JSONB DEFAULT '{}' NOT NULL,

    -- Standard timestamps.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- === INDEXES (For Performance) ===
-- Create indexes on all foreign keys and columns frequently used in WHERE clauses.
CREATE INDEX IF NOT EXISTS idx_blob_metadata_blob_id ON blob_metadata(blob_id);
CREATE INDEX IF NOT EXISTS idx_blob_metadata_organization_id ON blob_metadata(organization_id);
CREATE INDEX IF NOT EXISTS idx_blob_metadata_user_id ON blob_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_blob_metadata_status ON blob_metadata(status);
CREATE INDEX IF NOT EXISTS idx_blob_metadata_created_at ON blob_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_blob_metadata_filename ON blob_metadata(filename);


-- ----------------------------------------------------------------
-- Trigger to automatically update the `updated_at` timestamp.
-- ----------------------------------------------------------------
-- Note: The update_updated_at_column function already exists from previous migrations
-- We just need to create the trigger for the new table

DROP TRIGGER IF EXISTS update_blob_metadata_updated_at ON blob_metadata;
CREATE TRIGGER update_blob_metadata_updated_at
    BEFORE UPDATE ON blob_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();