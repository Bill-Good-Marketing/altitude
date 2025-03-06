UPDATE "crm"."addresses" AS a
SET "timezone" = tz."tz"
FROM "crm"."tz_data" AS tz
WHERE tz."countryCode" = a."country"
  AND tz."provinceName" = a."state"
  AND tz."name" = a."city";
