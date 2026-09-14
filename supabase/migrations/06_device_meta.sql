-- Migration: 06_device_meta.sql
-- Adds a JSONB column to track what OS and version the user is on

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS device_meta JSONB;
