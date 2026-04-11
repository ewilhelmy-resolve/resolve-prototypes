-- Add sharing support to conversations
-- share_status: 'private' (default), 'public', 'token'
-- share_token: random hex hash for token-protected shares
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS share_status TEXT DEFAULT 'private';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS share_token TEXT;
