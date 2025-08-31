-- Create default admin user
-- Email: admin@resolve.io
-- Password: admin123 (hashed with bcrypt)

-- First add is_admin column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

INSERT INTO users (email, password, full_name, is_admin, created_at) 
VALUES (
    'admin@resolve.io',
    '$2a$10$YZqVlJQNz5TlGGxFL7KWOe7cKScFJ/6r.HDwxD3vKdFgMdFvyMjsu', -- admin123
    'Admin User',
    true,
    NOW()
) 
ON CONFLICT (email) 
DO UPDATE SET 
    is_admin = true,
    full_name = 'Admin User';

-- Verify admin user was created
SELECT email, full_name, is_admin FROM users WHERE email = 'admin@resolve.io';