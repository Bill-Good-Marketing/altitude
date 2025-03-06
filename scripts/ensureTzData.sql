SET search_path TO crm;
CREATE TABLE IF NOT EXISTS tz_data (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  provinceName TEXT NOT NULL,
  countryCode VARCHAR(2) NOT NULL,
  tz TEXT NOT NULL
);
