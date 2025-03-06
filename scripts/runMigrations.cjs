// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    // For real-time logs, use { stdio: 'inherit' } instead of 'pipe'
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
  console.log(`Sleeping ${seconds} second(s)...`);
  try {
    execSync(`sleep ${seconds}`);
  } catch {
    // On Windows/minimal shells, 'sleep' may not exist. Replace with setTimeout if needed.
  }
}

function testDatabaseConnection() {
  console.log("Testing database connection...");
  try {
    const output = execSync('echo "SELECT 1;" | npx prisma db execute --stdin', { stdio: 'pipe' });
    console.log("Database connection successful:", output.toString().trim());
    return true;
  } catch (err) {
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    console.error("Database connection test failed:", errorOutput);
    return false;
  }
}

// ---------------- MAIN SCRIPT ---------------- //

// 1) Test DB Connection
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// 2) Ensure required schemas exist (if you do createSchemas.sql)
console.log("Ensuring required schemas exist (createSchemas.sql)...");
let schemaResult = runCommand("npx prisma db execute --file scripts/createSchemas.sql");
if (!schemaResult.success) {
  console.error("Failed to create required schemas. Exiting.");
  process.exit(1);
}

// 3) Sleep a few seconds to let DB settle
sleep(5);

// 4) Run Prisma migrations (deploy on Vercel, dev locally)
const migrationCmd = process.env.VERCEL
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name auto_migration --skip-seed";

console.log("Starting Prisma migrations...");
let migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  // If we detect the known P3009 error, handle it
  if (migrationResult.message.includes("P3009")) {
    console.error("Detected failed migration (P3009). Attempting to resolve...");
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Marking migration as applied: ${resolveCmd}`);
    let resolveResult = runCommand(resolveCmd);
    if (!resolveResult.success) {
      console.error("Failed to resolve the migration automatically. Exiting.");
      process.exit(1);
    }
    console.log("Migration marked as resolved. Re-running migrations...");
    migrationResult = runCommand(migrationCmd);
    if (!migrationResult.success) {
      console.error("Migrations still failing after resolving. Exiting.");
      process.exit(1);
    }
    console.log("Migrations applied successfully (after resolution).");
  } else {
    console.error("Migration deploy failed with an unexpected error. Exiting.");
    process.exit(1);
  }
}
console.log("Migrations applied successfully.");

// 5) **Now** optionally clear existing data if CLEAR_DB=true
if (process.env.CLEAR_DB === 'true') {
  console.log("Clearing the database via cleardb.sql (DELETE statements)...");
  let clearDbResult = runCommand("npx prisma db execute --file scripts/cleardb.sql");
  if (!clearDbResult.success) {
    console.error("Failed to clear the database (via DELETE). Exiting.");
    process.exit(1);
  }
  console.log("Database data cleared successfully.");
}

// 6) Additional ensures (addresses, tz_data)
console.log("Ensuring crm.addresses table exists (ensureAddresses.sql)...");
let ensureAddressesResult = runCommand("npx prisma db execute --file scripts/ensureAddresses.sql");
if (!ensureAddressesResult.success) {
  console.error("Failed to ensure crm.addresses table exists. Exiting.");
  process.exit(1);
}

console.log("Ensuring crm.tz_data table exists (ensureTzData.sql)...");
let ensureTzResult = runCommand("npx prisma db execute --file scripts/ensureTzData.sql");
if (!ensureTzResult.success) {
  console.error("Failed to ensure crm.tz_data table exists. Exiting.");
  process.exit(1);
}

// 7) Update TZ if needed
console.log("Executing updateTZ.sql to update timezone data...");
let updateTZResult = runCommand("npx prisma db execute --file prisma/sql/updateTZ.sql");
if (!updateTZResult.success) {
  console.error("Failed to execute updateTZ.sql. Exiting.");
  process.exit(1);
}

// 8) Generate Prisma client
console.log("Generating Prisma client with SQL support...");
let genResult = runCommand("npx prisma generate && npx prisma generate --sql");
if (!genResult.success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}
console.log("Prisma client generated successfully.");

// 9) Finally, seed with import-playground.ts
console.log("Importing demo data with import-playground.ts...");
let importResult = runCommand("npx tsx ./import-playground.ts");
if (!importResult.success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}
console.log("Demo data imported successfully.");
