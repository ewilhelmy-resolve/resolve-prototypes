-- Drop legacy tables that are no longer used in the Rita application
-- These tables are from the old POC architecture and have been replaced by:
-- - Keycloak for authentication (replaces users, sessions, password_reset_tokens)
-- - New Rita architecture (replaces integrations, tickets, workflow_triggers, etc.)
-- - pending_invitations table (replaces tenant_invitations)

-- IMPORTANT: This migration is designed to be safe and idempotent
-- All tables are dropped with CASCADE to handle any remaining foreign key constraints
-- IF EXISTS ensures the migration can be run multiple times without errors

-- ====================
-- LEGACY AUTH TABLES (Replaced by Keycloak)
-- ====================

-- Drop users table (replaced by Keycloak + user_profiles)
-- user_profiles now stores local user data with Keycloak user IDs
DROP TABLE IF EXISTS users CASCADE;

-- Drop sessions table (replaced by Keycloak JWT tokens)
-- Authentication now uses Keycloak access tokens, no local session storage needed
DROP TABLE IF EXISTS sessions CASCADE;

-- Drop password_reset_tokens table (replaced by Keycloak password reset flow)
-- Password reset is now handled entirely by Keycloak
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- ====================
-- LEGACY POC TABLES
-- ====================

-- Drop integrations table (old integration configurations)
-- Replaced by data_source_connections table for external service integrations
DROP TABLE IF EXISTS integrations CASCADE;

-- Drop tickets table (old ticket system)
-- Not used in Rita architecture - tickets managed by external services
DROP TABLE IF EXISTS tickets CASCADE;

-- Drop workflow_triggers table (old automation triggers)
-- Replaced by webhook-based event system via WebhookService
DROP TABLE IF EXISTS workflow_triggers CASCADE;

-- Drop admin_metrics table (old admin metrics aggregation)
-- Metrics now collected via audit_logs and future analytics service
DROP TABLE IF EXISTS admin_metrics CASCADE;

-- Drop system_config table (old system configuration)
-- Configuration now managed via environment variables and application config
DROP TABLE IF EXISTS system_config CASCADE;

-- Drop tenant_invitations table (old invitation system)
-- Replaced by pending_invitations table with better token management
DROP TABLE IF EXISTS tenant_invitations CASCADE;

-- ====================
-- LEGACY DEBUGGING TABLES
-- ====================

-- Drop webhook_traffic table (old webhook debugging/capture)
-- Webhook logging now handled by application logger (WebhookService)
DROP TABLE IF EXISTS webhook_traffic CASCADE;

-- Drop vector_search_logs table (old RAG search logging)
-- Vector search now managed by external Barista service
DROP TABLE IF EXISTS vector_search_logs CASCADE;

-- ====================
-- VERIFICATION
-- ====================

-- Log completion (for migration tracking)
DO $$
BEGIN
  RAISE NOTICE 'Migration 127: Successfully dropped 11 legacy tables';
  RAISE NOTICE '  - Auth tables: users, sessions, password_reset_tokens';
  RAISE NOTICE '  - POC tables: integrations, tickets, workflow_triggers, admin_metrics, system_config, tenant_invitations';
  RAISE NOTICE '  - Debug tables: webhook_traffic, vector_search_logs';
END $$;