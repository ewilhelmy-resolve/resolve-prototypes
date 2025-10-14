-- Create pending_invitations table for user invitation system
CREATE TABLE pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX idx_pending_invitations_token ON pending_invitations(invitation_token);
CREATE INDEX idx_pending_invitations_org_id ON pending_invitations(organization_id);
CREATE INDEX idx_pending_invitations_status ON pending_invitations(status);
CREATE INDEX idx_pending_invitations_token_expires_at ON pending_invitations(token_expires_at);

-- Unique constraint for pending invitations (prevent duplicate pending invitations for same email + organization)
CREATE UNIQUE INDEX idx_pending_invitations_unique_email_org
  ON pending_invitations(email, organization_id)
  WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE pending_invitations IS 'Stores organization user invitations until accepted';
COMMENT ON COLUMN pending_invitations.invitation_token IS 'Unique token sent via email for invitation acceptance';
COMMENT ON COLUMN pending_invitations.status IS 'Current status of the invitation (pending, accepted, expired, cancelled, failed)';
