SET search_path TO crm;

-- If you want to ensure the enum type is there, but it’s likely created by Prisma migrations.
DO $$
BEGIN
  CREATE TYPE "crm"."AddressType" AS ENUM ('HOME', 'WORK', 'VACATION', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Instead of dropping/creating the table, just clear it (if your goal is to remove all addresses).
-- If you don’t want to clear data, omit this line.
DELETE FROM "crm"."addresses";
