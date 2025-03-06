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
  console.log(`Sleeping ${seconds} second(s)...`);
  try {
    execSync(`sleep ${seconds}`);
  } catch {
    // Fallback if 'sleep' is not available.
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

// 1) Test the database connection.
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// 2) (Optional) Ensure required schemas exist.
// If your createSchemas.sql contains logic to create the 'crm' (or other) schemas,
// run it. Otherwise, you can remove this step.
console.log("Ensuring required schemas exist (createSchemas.sql)...");
const schemaResult = runCommand("npx prisma db execute --file scripts/createSchemas.sql");
if (!schemaResult.success) {
  console.error("Failed to create required schemas. Exiting.");
  process.exit(1);
}

// 3) Sleep a few seconds to let the database settle.
sleep(5);

// 4) Run Prisma migrations.
// On Vercel (production), this uses "prisma migrate deploy" which applies all migrations.
const migrationCmd = process.env.VERCEL
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name auto_migration --skip-seed";

console.log("Starting Prisma migrations...");
let migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  // If you encounter a known error (e.g. P3009), attempt to resolve it.
  if (migrationResult.message.includes("P3009")) {
    console.error("Detected failed migration (P3009). Attempting to resolve...");
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Marking migration as applied: ${resolveCmd}`);
    const resolveResult = runCommand(resolveCmd);
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

// 5) Optionally clear existing data.
// In production, you should leave CLEAR_DB unset or false so that data is preserved.
if (process.env.CLEAR_DB === "true" && process.env.NODE_ENV !== "production") {
  console.log("Clearing the database via cleardb.sql (DELETE statements)...");
  const clearDbResult = runCommand("npx prisma db execute --file scripts/cleardb.sql");
  if (!clearDbResult.success) {
    console.error("Failed to clear the database (via DELETE). Exiting.");
    process.exit(1);
  }
  console.log("Database data cleared successfully.");
} else {
  console.log("Skipping database clearing step (production environment or CLEAR_DB not set).");
}

// 6) (Optional) Run additional "ensure" scripts if needed.
// If these files (ensureAddresses.sql and ensureTzData.sql) only clear data, they can run here.
// If not needed, you can remove these steps.
console.log("Running ensureAddresses.sql...");
const ensureAddressesResult = runCommand("npx prisma db execute --file scripts/ensureAddresses.sql");
if (!ensureAddressesResult.success) {
  console.error("Failed to run ensureAddresses.sql. Exiting.");
  process.exit(1);
}
console.log("ensureAddresses.sql executed successfully.");

console.log("Running ensureTzData.sql...");
const ensureTzResult = runCommand("npx prisma db execute --file scripts/ensureTzData.sql");
if (!ensureTzResult.success) {
  console.error("Failed to run ensureTzData.sql. Exiting.");
  process.exit(1);
}
console.log("ensureTzData.sql executed successfully.");

// 7) Execute updateTZ.sql to update timezone data (if needed).
console.log("Executing updateTZ.sql to update timezone data...");
const updateTZResult = runCommand("npx prisma db execute --file prisma/sql/updateTZ.sql");
if (!updateTZResult.success) {
  console.error("Failed to execute updateTZ.sql. Exiting.");
  process.exit(1);
}
console.log("updateTZ.sql executed successfully.");

// 8) Generate the Prisma client (with SQL support).
console.log("Generating Prisma client with SQL support...");
const genResult = runCommand("npx prisma generate && npx prisma generate --sql");
if (!genResult.success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}
console.log("Prisma client generated successfully.");

// 9) Finally, seed the database by running import-playground.ts.
console.log("Importing demo data with import-playground.ts...");
const importResult = runCommand("npx tsx ./import-playground.ts");
if (!importResult.success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}
console.log("Demo data imported successfully.");

process.exit(0);
