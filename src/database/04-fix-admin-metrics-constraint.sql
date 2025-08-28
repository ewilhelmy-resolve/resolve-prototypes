-- Fix for the admin_metrics table missing unique constraint
-- This will add the missing constraint that the ON CONFLICT clause expects
-- Made idempotent with DO block to check if constraint exists first

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_metrics_metric_date_unique'
    ) THEN
        ALTER TABLE admin_metrics 
        ADD CONSTRAINT admin_metrics_metric_date_unique UNIQUE (metric_date);
    END IF;
END $$;

-- Verify the constraint was added
SELECT conname FROM pg_constraint 
WHERE conrelid = 'admin_metrics'::regclass 
AND contype = 'u';