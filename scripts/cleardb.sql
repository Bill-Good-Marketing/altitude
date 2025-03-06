-- Clear crm.contacts (if it exists)
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."contacts";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."contacts" does not exist, skipping.';
END $$;

-- Clear crm.logs
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."logs";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."logs" does not exist, skipping.';
END $$;

-- Clear crm.tenets
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."tenets";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."tenets" does not exist, skipping.';
END $$;

-- Clear crm.users
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."users";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."users" does not exist, skipping.';
END $$;

-- Clear crm.tokens
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."tokens";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."tokens" does not exist, skipping.';
END $$;

-- Clear crm.config
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."config";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."config" does not exist, skipping.';
END $$;

-- Clear crm.addresses
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."addresses";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."addresses" does not exist, skipping.';
END $$;

-- Clear crm.activities
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."activities";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."activities" does not exist, skipping.';
END $$;

-- Clear crm.notes
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."notes";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."notes" does not exist, skipping.';
END $$;

-- Clear crm.attachments
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."attachments";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."attachments" does not exist, skipping.';
END $$;

-- Clear crm.activity_contact_join
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."activity_contact_join";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."activity_contact_join" does not exist, skipping.';
END $$;

-- Clear crm.activity_user_join
DO $$
BEGIN
  EXECUTE 'DELETE FROM "crm"."activity_user_join";';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table "crm"."activity_user_join" does not exist, skipping.';
END $$;
