-- PostgreSQL initialization script
-- This file is executed when the PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The database and user are created by Docker environment variables
-- Additional initialization can be added here if needed

-- Example: Grant all privileges on database to user (already done by default)
-- GRANT ALL PRIVILEGES ON DATABASE resolve_onboarding TO resolve_user;
