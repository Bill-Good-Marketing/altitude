SET search_path TO crm;

CREATE TABLE tz_data (
  id SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "provinceName" TEXT NOT NULL,
  "countryCode" VARCHAR(2) NOT NULL,
  "tz" TEXT NOT NULL
);

CREATE UNIQUE INDEX tz_data_name_provinceName_countryCode_key
  ON tz_data("name", "provinceName", "countryCode");
