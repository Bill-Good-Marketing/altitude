-- scripts/ensureTzData.sql
SET search_path TO crm;

-- **Drop the table first if it exists.**
DROP TABLE IF EXISTS tz_data CASCADE;

-- Then recreate it with the correct columns.
CREATE TABLE tz_data (
  id SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "provinceName" TEXT NOT NULL,
  "countryCode" VARCHAR(2) NOT NULL,
  "tz" TEXT NOT NULL
);

-- Optionally recreate the unique index if needed:
CREATE UNIQUE INDEX tz_data_name_provinceName_countryCode_key
  ON tz_data("name", "provinceName", "countryCode");
