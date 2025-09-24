-- Change blobs.blob_id from SERIAL to UUID
-- This migration modifies the primary key of blobs table and updates the foreign key in blob_metadata

-- Step 1: Add a new UUID column to blobs table
ALTER TABLE blobs ADD COLUMN new_blob_id UUID DEFAULT gen_random_uuid();

-- Step 2: Populate the new UUID column for existing records
UPDATE blobs SET new_blob_id = gen_random_uuid() WHERE new_blob_id IS NULL;

-- Step 3: Add a new UUID column to blob_metadata to reference the new UUID
ALTER TABLE blob_metadata ADD COLUMN new_blob_id UUID;

-- Step 4: Populate the new foreign key column in blob_metadata
UPDATE blob_metadata
SET new_blob_id = blobs.new_blob_id
FROM blobs
WHERE blob_metadata.blob_id = blobs.blob_id;

-- Step 5: Make the new columns NOT NULL
ALTER TABLE blobs ALTER COLUMN new_blob_id SET NOT NULL;
ALTER TABLE blob_metadata ALTER COLUMN new_blob_id SET NOT NULL;

-- Step 6: Drop the old foreign key constraint
ALTER TABLE blob_metadata DROP CONSTRAINT blob_metadata_blob_id_fkey;

-- Step 7: Drop the old index on blob_metadata.blob_id
DROP INDEX IF EXISTS idx_blob_metadata_blob_id;

-- Step 8: Drop the old columns
ALTER TABLE blob_metadata DROP COLUMN blob_id;
ALTER TABLE blobs DROP COLUMN blob_id;

-- Step 9: Rename the new columns to the original names
ALTER TABLE blobs RENAME COLUMN new_blob_id TO blob_id;
ALTER TABLE blob_metadata RENAME COLUMN new_blob_id TO blob_id;

-- Step 10: Add the primary key constraint to the new UUID column
ALTER TABLE blobs ADD PRIMARY KEY (blob_id);

-- Step 11: Add the foreign key constraint back
ALTER TABLE blob_metadata ADD CONSTRAINT blob_metadata_blob_id_fkey
    FOREIGN KEY (blob_id) REFERENCES blobs(blob_id) ON DELETE CASCADE;

-- Step 12: Recreate the index on blob_metadata.blob_id
CREATE INDEX idx_blob_metadata_blob_id ON blob_metadata(blob_id);