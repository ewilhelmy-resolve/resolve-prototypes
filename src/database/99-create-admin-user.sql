-- Create default admin user
-- Email: admin@resolve.io
-- Password: admin123 (hashed with bcrypt)

INSERT INTO users (email, hashed_password, name, is_admin, created_at) 
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
    name = 'Admin User';

-- Verify admin user was created
SELECT email, name, is_admin FROM users WHERE email = 'admin@resolve.io';