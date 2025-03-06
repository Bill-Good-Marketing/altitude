// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    // If you want real-time logs, use { stdio: 'inherit' } instead of 'pipe'
    const output = execSync(cmd, { stdio: 'pipe' });
    console.log(`Command succeeded: ${cmd}`);
    return { success: true, output: output.toString() };
  } catch (err) {
    // Some errors put messages in stderr; others are just the error message
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    console.error(`Error running "${cmd}": ${errorOutput}`);
    return { success: false, message: errorOutput };
  }
}

function sleep(seconds) {
  try {
    console.log(`Sleeping ${seconds} second(s)...`);
    execSync(`sleep ${seconds}`);
  } catch (err) {
    // Some environments (Windows) may not have the `sleep` command installed
    // You can write a Node-based sleep if needed.
  }
}

function testDatabaseConnection() {
  console.log('Testing database connection...');
  try {
    // Attempt a simple SQL query using Prisma's db execute
    const output = execSync('echo "SELECT 1;" | npx prisma db execute --stdin', { stdio: 'pipe' });
    console.log('Database connection successful:', output.toString().trim());
    return true;
  } catch (err) {
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    console.error('Database connection test failed:', errorOutput);
    return false;
  }
}

// ----- Main Script Execution -----

// Step A: Optionally clear the database first if CLEAR_DB is set
if (process.env.CLEAR_DB === 'true') {
  console.log('Clearing the database...');
  const clearDbResult = runCommand('npx prisma db execute --file scripts/cleardb.sql');
  if (!clearDbResult.success) {
    console.error('Failed to clear the database. Exiting.');
    process.exit(1);
  }
  console.log('Database cleared successfully.');
}

// Step 0: Test DB connection
if (!testDatabaseConnection()) {
  console.error('Cannot connect to the database using DATABASE_URL. Exiting.');
  process.exit(1);
}

// Step 1: Ensure required schemas exist.
console.log('Ensuring required schemas exist (createSchemas.sql)...');
const schemaResult = runCommand('npx prisma db execute --file scripts/createSchemas.sql');
if (!schemaResult.success) {
  console.error('Failed to create required schemas. Exiting.');
  process.exit(1);
}

// Step 2: Sleep 5 seconds to ensure DB is fully initialized.
sleep(5);

// Step 3: Run migrations (deploy on Vercel, dev locally).
const migrationCmd = process.env.VERCEL
  ? 'npx prisma migrate deploy'
  : 'npx prisma migrate dev --name auto_migration --skip-seed';

console.log('Starting Prisma migrations...');
let migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  // If we encountered P3009, we try to resolve specifically
  if (migrationResult.message.includes('P3009')) {
    console.error('Detected failed migration (P3009). Attempting to resolve...');
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Marking migration as applied: ${resolveCmd}`);
    const resolveResult = runCommand(resolveCmd);
    if (!resolveResult.success) {
      console.error('Failed to resolve the migration automatically. Exiting.');
      process.exit(1);
    }

    console.log('Migration marked as resolved. Re-running migrations...');
    migrationResult = runCommand(migrationCmd);
    if (!migrationResult.success) {
      console.error('Migrations still failing after resolving. Exiting.');
      process.exit(1);
    }
    console.log('Migrations applied successfully after resolution. Now importing demo data...');
    const importResult = runCommand('npx tsx ./import-playground.ts');
    if (!importResult.success) {
      console.error('Error importing demo data. Exiting.');
      process.exit(1);
    }
  } else {
    console.error('Migration deploy failed with an unexpected error. Exiting.');
    process.exit(1);
  }
} else {
  console.log('Migrations applied successfully.');
}

// Step 4: Ensure required tables exist (example: addresses).
console.log('Ensuring crm.addresses table exists (ensureAddresses.sql)...');
const ensureAddressesResult = runCommand('npx prisma db execute --file scripts/ensureAddresses.sql');
if (!ensureAddressesResult.success) {
  console.error('Failed to ensure crm.addresses table exists. Exiting.');
  process.exit(1);
}

// Step 4b: Ensure crm.tz_data table exists (ensureTzData.sql).
console.log('Ensuring crm.tz_data table exists (ensureTzData.sql)...');
const ensureTzResult = runCommand('npx prisma db execute --file scripts/ensureTzData.sql');
if (!ensureTzResult.success) {
  console.error('Failed to ensure crm.tz_data table exists. Exiting.');
  process.exit(1);
}

// Step 5: Update TZ info if needed (updateTZ.sql).
console.log('Executing updateTZ.sql to update timezone data...');
const updateTZResult = runCommand('npx prisma db execute --file prisma/sql/updateTZ.sql');
if (!updateTZResult.success) {
  console.error('Failed to execute updateTZ.sql. Exiting.');
  process.exit(1);
}

// Step 6: Generate Prisma client(s)
console.log('Generating Prisma client with SQL support...');
const genResult = runCommand('npx prisma generate && npx prisma generate --sql');
if (!genResult.success) {
  console.error('Failed to generate Prisma client. Exiting.');
  process.exit(1);
}
console.log('Prisma client generated successfully.');

// Step 7: Always seed the database (import-playground.ts)
console.log('Importing demo data with import-playground.ts...');
const importResult = runCommand('npx tsx ./import-playground.ts');
if (!importResult.success) {
  console.error('Error importing demo data. Exiting.');
  process.exit(1);
}
console.log('Demo data imported successfully.');
