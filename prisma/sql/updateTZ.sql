UPDATE "crm"."addresses"
SET "timezone" = (
    SELECT "tz" FROM "crm"."tz_data" WHERE "countryCode" = $1 AND "provinceName" = $2 AND "name" = $3
);