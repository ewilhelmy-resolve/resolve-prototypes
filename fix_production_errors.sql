-- Fix for the admin_metrics table missing unique constraint
-- This will add the missing constraint that the ON CONFLICT clause expects

ALTER TABLE admin_metrics 
ADD CONSTRAINT admin_metrics_metric_date_unique UNIQUE (metric_date);

-- Verify the constraint was added
SELECT conname FROM pg_constraint 
WHERE conrelid = 'admin_metrics'::regclass 
AND contype = 'u';