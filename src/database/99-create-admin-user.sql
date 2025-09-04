-- Create default admin user
-- Email: admin@resolve.io
-- Password: admin123 (hashed with bcrypt)

-- First add is_admin column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Note: Only update password if it's not already a bcrypt hash
INSERT INTO users (email, password, full_name, is_admin, created_at) 
VALUES (
    'admin@resolve.io',
    '$2b$10$D.uCFMXDzXT47Ej1mM.4R.R6PzGg47rNZBWLaoy/40i3UadhnI2JW', -- admin123 (bcrypt hash)
    'Admin User',
    true,
    NOW()
) 
ON CONFLICT (email) 
DO UPDATE SET 
    password = CASE 
        WHEN users.password NOT LIKE '$2b$%' THEN '$2b$10$D.uCFMXDzXT47Ej1mM.4R.R6PzGg47rNZBWLaoy/40i3UadhnI2JW'
        ELSE users.password
    END,
    is_admin = true,
    full_name = 'Admin User';

-- Verify admin user was created
SELECT email, full_name, is_admin FROM users WHERE email = 'admin@resolve.io';