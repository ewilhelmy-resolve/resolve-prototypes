-- Migration: Add public guest user for iframe access
-- Description: Creates public organization and guest user for unauthenticated iframe chat
-- Date: 2025-11-26
--
-- PUBLIC SYSTEM CONSTANTS (also defined in IframeService.ts):
--   PUBLIC_ORG_ID  = '00000000-0000-0000-0000-000000000001'
--   PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000002'
--
-- IMPORTANT: Users in this org should have RESTRICTED features:
--   - No file uploads
--   - No data source connections
--   - Limited conversation history
--   - No org settings access
--
-- Use isPublicUser() and isPublicOrganization() helpers in code to check.

-- 1. Create public system organization
-- This org is for all public/guest access (iframe embeds, etc.)
INSERT INTO organizations (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Public System - Restricted Access',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create public guest user
-- Single shared user for all public iframe sessions
INSERT INTO user_profiles (
  user_id,
  email,
  keycloak_id,
  first_name,
  last_name,
  active_organization_id,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'public-guest@internal.system',
  'public-guest-system',
  'Public',
  'Guest',
  '00000000-0000-0000-0000-000000000001',
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- 3. Add public user to organization with 'public' role
-- The 'public' role indicates restricted access
INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'public',
  true,
  NOW()
) ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Rollback instructions:
-- DELETE FROM organization_members WHERE user_id = '00000000-0000-0000-0000-000000000002';
-- DELETE FROM user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000002';
-- DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';
