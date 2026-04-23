-- Migration: 173_add_cluster_discovery_unique_constraint.sql
-- Prevent duplicate discovery rows for same ticket+cluster_name per org

CREATE UNIQUE INDEX uq_cluster_discovery_org_ticket_cluster
    ON cluster_discovery(organization_id, ticket_id, cluster_name);

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- DROP INDEX IF EXISTS uq_cluster_discovery_org_ticket_cluster;
