-- Row Level Security (RLS) Policies for Multi-tenant Data Isolation
-- Ensures users can only access data from their active organization

-- Enable RLS on all tenant-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: user_profiles table doesn't need RLS as it's keyed by user_id directly

-- Organizations: Users can only see organizations they are members of
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Organization members: Users can view members of their organizations
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Messages: Users can only access messages from their active organization
CREATE POLICY "Users can view messages from their active organization" ON messages
  FOR ALL USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Documents: Users can only access documents from their active organization
CREATE POLICY "Users can view documents from their active organization" ON documents
  FOR ALL USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Audit logs: Users can only view audit logs from their active organization
CREATE POLICY "Users can view audit logs from their active organization" ON audit_logs
  FOR SELECT USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

-- Insert policies for creating new records
CREATE POLICY "Users can create messages in their active organization" ON messages
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY "Users can create documents in their active organization" ON documents
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );