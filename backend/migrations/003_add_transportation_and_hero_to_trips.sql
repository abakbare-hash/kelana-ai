-- Migration: 003_add_transportation_and_hero_to_trips
-- Adds transportation and hero_image columns to the trips table

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS transportation VARCHAR(255);

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS hero_image VARCHAR(1024);

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS travel_style VARCHAR(255);
