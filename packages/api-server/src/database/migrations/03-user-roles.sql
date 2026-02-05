-- Migration: Add role-based access control to users table
-- This migration adds RBAC support for user management

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Add status column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add last_login_at column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Add invited_at column for tracking invitations
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;

-- Add invited_by column to track who invited the user
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id);

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create index on tenant_id for tenant isolation
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Update existing admin users to have tenant-admin role
UPDATE users 
SET role = 'tenant-admin' 
WHERE email IN (
    SELECT DISTINCT email 
    FROM users 
    WHERE email LIKE '%admin%' 
    OR email = 'admin@resolve.io'
    OR email = 'john.gorham@resolve.io'
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Create tenant invitations table for share flow
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    invited_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id ON tenant_invitations(tenant_id);

-- Add unique constraint for email within tenant
-- Note: This allows the same email in different tenants
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);

-- Function to check if user is last admin in tenant
CREATE OR REPLACE FUNCTION is_last_tenant_admin(p_user_id INTEGER) 
RETURNS BOOLEAN AS $$
DECLARE
    tenant_uuid UUID;
    admin_count INTEGER;
BEGIN
    -- Get the tenant_id for this user
    SELECT tenant_id INTO tenant_uuid FROM users WHERE id = p_user_id;
    
    -- Count admins in this tenant excluding the given user
    SELECT COUNT(*) INTO admin_count 
    FROM users 
    WHERE tenant_id = tenant_uuid 
    AND role = 'tenant-admin'
    AND status = 'active'
    AND id != p_user_id;
    
    RETURN admin_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure at least one admin per tenant
CREATE OR REPLACE FUNCTION ensure_tenant_has_admin() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check for DELETE operations
    IF TG_OP = 'DELETE' THEN
        IF OLD.role = 'tenant-admin' AND is_last_tenant_admin(OLD.id) THEN
            RAISE EXCEPTION 'Cannot delete the last tenant admin';
        END IF;
    END IF;
    
    -- Check for UPDATE operations (changing role or status)
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.role = 'tenant-admin' AND NEW.role != 'tenant-admin') OR
           (OLD.status = 'active' AND NEW.status != 'active' AND OLD.role = 'tenant-admin') THEN
            IF is_last_tenant_admin(OLD.id) THEN
                RAISE EXCEPTION 'Cannot remove admin role from the last tenant admin';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure at least one admin per tenant
DROP TRIGGER IF EXISTS ensure_tenant_admin_trigger ON users;
CREATE TRIGGER ensure_tenant_admin_trigger
BEFORE DELETE OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION ensure_tenant_has_admin();