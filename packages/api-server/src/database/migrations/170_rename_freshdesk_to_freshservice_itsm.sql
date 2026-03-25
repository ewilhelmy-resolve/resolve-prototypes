-- Migration: 170_rename_freshdesk_to_freshservice_itsm.sql
-- Rename data source type from 'freshdesk' to 'freshservice_itsm'
-- to match the correct external platform identifier
-- Pattern: same approach as 156_rename_jira_to_jira_itsm.sql

-- Step 1: Rename freshdesk -> freshservice_itsm where target doesn't already exist
UPDATE data_source_connections d1
SET type = 'freshservice_itsm',
    updated_at = NOW()
WHERE d1.type = 'freshdesk'
  AND NOT EXISTS (
    SELECT 1 FROM data_source_connections d2
    WHERE d2.organization_id = d1.organization_id AND d2.type = 'freshservice_itsm'
  );

-- Step 2: Delete remaining freshdesk records (org already had freshservice_itsm)
DELETE FROM data_source_connections
WHERE type = 'freshdesk';

-- =============================================================================
-- ROLLBACK (manual)
-- =============================================================================
-- NOTE: Cannot recover rows deleted in step 2.
--
-- UPDATE data_source_connections SET type = 'freshdesk' WHERE type = 'freshservice_itsm';
