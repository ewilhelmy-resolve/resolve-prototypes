-- Add sent_at field to messages table
ALTER TABLE messages ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;