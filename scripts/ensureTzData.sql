SET search_path TO crm;

-- Instead of dropping/creating the table, just clear it (if that's desired).
DELETE FROM "crm"."tz_data";

-- If you want to re-insert or repopulate data, you can add INSERT statements here.
-- For example:
-- INSERT INTO "crm"."tz_data" ("name", "provinceName", "countryCode", "tz")
-- VALUES ('Some City', 'Some Province', 'US', 'America/New_York'), ...
