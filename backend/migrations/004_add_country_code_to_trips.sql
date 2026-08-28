-- Migration: 004_add_country_code_to_trips
-- Adds an ISO 3166-1 alpha-2 country code column to the trips table

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
