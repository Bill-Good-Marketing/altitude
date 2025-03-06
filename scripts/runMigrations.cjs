// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    const output = execSync(cmd, { stdio: 'pipe' });
    console.log(`Command succeeded: ${cmd}`);
    return { success: true, output: output.toString() };
  } catch (err) {
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    console.error(`Error running "${cmd}": ${errorOutput}`);
    return { success: false, message: errorOutput };
  }
}

function sleep(seconds) {
  try {
    execSync(`sleep ${seconds}`);
  } catch (err) {
    // ignore errors
  }
}

// Step 1: Ensure required schemas exist
console.log("Ensuring required schemas exist...");
const schemaResult = runCommand("npx prisma db execute --file scripts/createSchemas.sql");
if (!schemaResult.success) {
  console.error("Failed to create required schemas. Exiting.");
  process.exit(1);
}

// Step 2: Wait 5 seconds to ensure the database is fully initialized (mimicking local delay)
console.log("Waiting 5 seconds to ensure database is fully initialized...");
sleep(5);

// Step 3: Run automatic migrations (development-style)
console.log("Running automatic migrations (dev mode)...");
let migrationResult = runCommand("npx prisma migrate dev --name auto_migration --skip-seed");

if (!migrationResult.success) {
  const errorOutput = migrationResult.message;
  if (errorOutput.includes("P3009")) {
    console.error("Detected failed migration (P3009).");
    // Force-resolve the problematic migration
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Attempting to mark migration as applied: ${resolveCmd}`);
    const resolveResult = runCommand(resolveCmd);
    if (!resolveResult.success) {
      console.error("Failed to resolve the migration automatically. Exiting.");
      process.exit(1);
    }
    console.log("Migration marked as resolved. Re-running migrations...");
    migrationResult = runCommand("npx prisma migrate dev --name auto_migration --skip-seed");
    if (!migrationResult.success) {
      console.error("Migrations still failing after resolving. Exiting.");
      process.exit(1);
    }
  } else {
    console.error("Migration failed with an unexpected error. Exiting.");
    process.exit(1);
  }
}
console.log("Migrations applied successfully.");

// Step 4: Ensure required tables exist

// Ensure crm.addresses exists
console.log("Ensuring crm.addresses table exists...");
const ensureAddressesResult = runCommand("npx prisma db execute --file scripts/ensureAddresses.sql");
if (!ensureAddressesResult.success) {
  console.error("Failed to ensure crm.addresses table exists. Exiting.");
  process.exit(1);
}

// Ensure crm.tz_data exists
console.log("Ensuring crm.tz_data table exists...");
const ensureTzResult = runCommand("npx prisma db execute --file scripts/ensureTzData.sql");
if (!ensureTzResult.success) {
  console.error("Failed to ensure crm.tz_data table exists. Exiting.");
  process.exit(1);
}

// Step 5: Import demo data (if needed)
console.log("Importing demo data...");
const importResult = runCommand("npx tsx ./import-playground.ts");
if (!importResult.success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}

// Step 6: Generate Prisma client with SQL support
console.log("Generating Prisma client with SQL support...");
const genResult = runCommand("npx prisma generate && npx prisma generate --sql");
if (!genResult.success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}

console.log("Prisma client generated successfully.");
