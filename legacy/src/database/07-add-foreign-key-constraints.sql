-- IDEMPOTENT Migration to add foreign key constraints for proper cascade deletion
-- This addresses the critical bug where document deletion leaves orphaned vectors
-- Date: 2025-08-30
-- Issue: Document deletion does not clean up associated vectors and dependencies
-- 
-- SAFETY: This migration can be run multiple times safely (idempotent)
-- CLEANUP: Always cleans up orphaned vectors before and after constraint creation

DO $$
DECLARE
    orphaned_before INTEGER := 0;
    orphaned_after INTEGER := 0;
    deleted_count INTEGER := 0;
    unique_constraint_exists BOOLEAN := FALSE;
    foreign_key_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Starting idempotent migration: 07-add-foreign-key-constraints';
    
    -- Step 1: Count and clean up existing orphaned vectors BEFORE constraints
    -- This includes comprehensive cleanup of all possible orphaned scenarios
    RAISE NOTICE '=== STEP 1: ORPHANED VECTOR CLEANUP (PRE-CONSTRAINT) ===';
    
    -- Count orphaned vectors before cleanup
    SELECT COUNT(*) INTO orphaned_before
    FROM rag_vectors v
    LEFT JOIN rag_documents d ON v.document_id = d.document_id AND v.tenant_id = d.tenant_id
    WHERE d.document_id IS NULL;
    
    RAISE NOTICE 'Found % orphaned vectors before cleanup', orphaned_before;
    
    -- Clean up vectors where document_id doesn't exist at all
    DELETE FROM rag_vectors 
    WHERE document_id NOT IN (
        SELECT DISTINCT document_id 
        FROM rag_documents 
        WHERE document_id IS NOT NULL
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned vectors (no matching document)', deleted_count;
    
    -- Clean up vectors where document exists but tenant mismatch
    DELETE FROM rag_vectors v
    WHERE NOT EXISTS (
        SELECT 1 FROM rag_documents d 
        WHERE d.document_id = v.document_id AND d.tenant_id = v.tenant_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned vectors (tenant mismatch)', deleted_count;
    
    -- Clean up vectors where document_id is NULL
    DELETE FROM rag_vectors WHERE document_id IS NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % vectors with NULL document_id', deleted_count;
    
    -- Clean up vectors where tenant_id is NULL
    DELETE FROM rag_vectors WHERE tenant_id IS NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % vectors with NULL tenant_id', deleted_count;
    
    -- Step 2: Fix rag_documents table structure (idempotent)
    RAISE NOTICE '=== STEP 2: DOCUMENT TABLE STRUCTURE FIXES ===';
    
    -- Update any NULL document_id values (safety check - shouldn't exist)
    UPDATE rag_documents 
    SET document_id = gen_random_uuid() 
    WHERE document_id IS NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Fixed % documents with NULL document_id', deleted_count;
    END IF;
    
    -- Make document_id NOT NULL (idempotent - will succeed if already NOT NULL)
    BEGIN
        ALTER TABLE rag_documents ALTER COLUMN document_id SET NOT NULL;
        RAISE NOTICE 'Set document_id column to NOT NULL';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'document_id column already NOT NULL or error: %', SQLERRM;
    END;
    
    -- Step 3: Add unique constraint (idempotent)
    RAISE NOTICE '=== STEP 3: UNIQUE CONSTRAINT CREATION ===';
    
    -- Check if unique constraint already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uk_rag_docs_document_tenant' 
        AND table_name = 'rag_documents'
        AND table_schema = 'public'
    ) INTO unique_constraint_exists;
    
    IF NOT unique_constraint_exists THEN
        BEGIN
            ALTER TABLE rag_documents 
            ADD CONSTRAINT uk_rag_docs_document_tenant 
            UNIQUE (document_id, tenant_id);
            RAISE NOTICE 'Created unique constraint: uk_rag_docs_document_tenant';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Unique constraint uk_rag_docs_document_tenant already exists';
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create unique constraint: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Unique constraint uk_rag_docs_document_tenant already exists';
    END IF;
    
    -- Step 4: Add foreign key constraint (idempotent)
    RAISE NOTICE '=== STEP 4: FOREIGN KEY CONSTRAINT CREATION ===';
    
    -- Check if foreign key constraint already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rag_vectors_document_id' 
        AND table_name = 'rag_vectors'
        AND table_schema = 'public'
    ) INTO foreign_key_exists;
    
    IF NOT foreign_key_exists THEN
        BEGIN
            ALTER TABLE rag_vectors 
            ADD CONSTRAINT fk_rag_vectors_document_id 
            FOREIGN KEY (document_id, tenant_id) 
            REFERENCES rag_documents(document_id, tenant_id) 
            ON DELETE CASCADE;
            RAISE NOTICE 'Created foreign key constraint: fk_rag_vectors_document_id';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint fk_rag_vectors_document_id already exists';
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create foreign key constraint: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_rag_vectors_document_id already exists';
    END IF;
    
    -- Step 5: Final orphaned vector cleanup (post-constraint validation)
    RAISE NOTICE '=== STEP 5: POST-CONSTRAINT ORPHANED VECTOR VERIFICATION ===';
    
    -- Count any remaining orphaned vectors (should be 0 if constraints are working)
    SELECT COUNT(*) INTO orphaned_after
    FROM rag_vectors v
    LEFT JOIN rag_documents d ON v.document_id = d.document_id AND v.tenant_id = d.tenant_id
    WHERE d.document_id IS NULL;
    
    IF orphaned_after > 0 THEN
        RAISE WARNING 'WARNING: % orphaned vectors still exist after constraint creation!', orphaned_after;
        -- Clean them up manually as safety measure
        DELETE FROM rag_vectors v
        WHERE NOT EXISTS (
            SELECT 1 FROM rag_documents d 
            WHERE d.document_id = v.document_id AND d.tenant_id = v.tenant_id
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Emergency cleanup: Deleted % remaining orphaned vectors', deleted_count;
    ELSE
        RAISE NOTICE 'SUCCESS: No orphaned vectors remain';
    END IF;
    
    -- Step 6: Add documentation comments (idempotent)
    RAISE NOTICE '=== STEP 6: ADDING DOCUMENTATION ===';
    
    IF unique_constraint_exists OR EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uk_rag_docs_document_tenant' 
        AND table_name = 'rag_documents'
    ) THEN
        COMMENT ON CONSTRAINT uk_rag_docs_document_tenant ON rag_documents 
        IS 'Unique constraint required for foreign key reference from rag_vectors (Migration 07)';
    END IF;
    
    IF foreign_key_exists OR EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rag_vectors_document_id' 
        AND table_name = 'rag_vectors'
    ) THEN
        COMMENT ON CONSTRAINT fk_rag_vectors_document_id ON rag_vectors 
        IS 'Ensures vectors are automatically deleted when their document is deleted CASCADE (Migration 07)';
    END IF;
    
    -- Step 7: Final verification and summary
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Orphaned vectors before: %', orphaned_before;
    RAISE NOTICE 'Orphaned vectors after: %', orphaned_after;
    RAISE NOTICE 'Unique constraint exists: %', (
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'uk_rag_docs_document_tenant' 
            AND table_name = 'rag_documents'
        )
    );
    RAISE NOTICE 'Foreign key constraint exists: %', (
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_rag_vectors_document_id' 
            AND table_name = 'rag_vectors'
        )
    );
    
    RAISE NOTICE 'Migration 07-add-foreign-key-constraints completed successfully!';
    RAISE NOTICE 'This migration is idempotent and can be safely re-run.';
    
END $$;