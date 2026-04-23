-- Migration: 174_add_ticket_resolution.sql
-- Adds resolution column to tickets table for historical ticket identification
-- Tickets with resolution IS NOT NULL are usable for knowledge article generation

ALTER TABLE tickets ADD COLUMN resolution TEXT;

COMMENT ON COLUMN tickets.resolution IS 'Close/resolution notes from ITSM system. Non-null indicates a historical ticket usable for knowledge generation.';
