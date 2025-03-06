SET search_path TO crm;
DROP TABLE IF EXISTS addresses CASCADE;

CREATE TABLE addresses (
  id BYTEA PRIMARY KEY,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL,  -- This column is required by updateTZ.sql
  type "crm"."AddressType" NOT NULL,
  "primary" BOOLEAN NOT NULL DEFAULT false,
  contactId BYTEA NOT NULL,
  tenetId BYTEA NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL,
  timezone TEXT
);
