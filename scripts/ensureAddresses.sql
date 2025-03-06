SET search_path TO crm;
CREATE TABLE IF NOT EXISTS addresses (
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