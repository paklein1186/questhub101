
-- 1. Expand territory_level enum with finer-grained levels
ALTER TYPE territory_level ADD VALUE IF NOT EXISTS 'LOCALITY';
ALTER TYPE territory_level ADD VALUE IF NOT EXISTS 'PROVINCE';
ALTER TYPE territory_level ADD VALUE IF NOT EXISTS 'CONTINENT';
ALTER TYPE territory_level ADD VALUE IF NOT EXISTS 'GLOBAL';
