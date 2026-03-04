-- Migration: 170_rename_freshdesk_to_freshservice_itsm.sql
-- Rename data source type from 'freshdesk' to 'freshservice_itsm'
-- to match the correct external platform identifier

UPDATE data_source_connections SET type = 'freshservice_itsm' WHERE type = 'freshdesk';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- UPDATE data_source_connections SET type = 'freshdesk' WHERE type = 'freshservice_itsm';
