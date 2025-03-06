SET search_path TO crm;

-- Create the enum type "crm"."AddressType" if it doesn't exist.
DO $$
BEGIN
  CREATE TYPE "crm"."AddressType" AS ENUM ('HOME', 'WORK', 'VACATION', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop the addresses table if it exists (optional, if you want to ensure a fresh table)
DROP TABLE IF EXISTS addresses CASCADE;

-- Create the addresses table with the expected columns.
CREATE TABLE addresses (
  id BYTEA PRIMARY KEY,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL,
  type "crm"."AddressType" NOT NULL,
  "primary" BOOLEAN NOT NULL DEFAULT false,
  contactId BYTEA NOT NULL,
  tenetId BYTEA NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL,
  timezone TEXT
);
