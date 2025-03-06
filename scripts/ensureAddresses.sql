-- scripts/ensureAddresses.sql
CREATE TABLE IF NOT EXISTS crm.addresses (
  id SERIAL PRIMARY KEY,
  street VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  zip VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
