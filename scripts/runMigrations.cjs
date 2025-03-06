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

// Optional: Wait a few seconds to ensure the database is fully initialized
console.log("Waiting 5 seconds to ensure database is fully initialized...");
sleep(5);

// Step 2: Run migrations using the appropriate command
let migrationCmd;
if (process.env.VERCEL) {
  // In production, use deploy (does not use a shadow DB)
  migrationCmd = "npx prisma migrate deploy";
} else {
  // In local development, use migrate dev (which creates or resets the DB)
  migrationCmd = "npx prisma migrate dev --name auto_migration --skip-seed";
}

console.log("Starting Prisma migrations...");
const migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  console.error("Migration failed. Exiting.");
  process.exit(1);
}

console.log("Migrations applied successfully.");

// Step 3: Ensure required tables exist

console.log("Ensuring crm.addresses table exists...");
const ensureAddressesResult = runCommand("npx prisma db execute --file scripts/ensureAddresses.sql");
if (!ensureAddressesResult.success) {
  console.error("Failed to ensure crm.addresses table exists. Exiting.");
  process.exit(1);
}

console.log("Ensuring crm.tz_data table exists...");
const ensureTzResult = runCommand("npx prisma db execute --file scripts/ensureTzData.sql");
if (!ensureTzResult.success) {
  console.error("Failed to ensure crm.tz_data table exists. Exiting.");
  process.exit(1);
}

// Step 4: Optionally import demo data (adjust as needed)
console.log("Importing demo data...");
const importResult = runCommand("npx tsx ./import-playground.ts");
if (!importResult.success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}

// Step 5: Generate Prisma client with SQL support
console.log("Generating Prisma client with SQL support...");
const genResult = runCommand("npx prisma generate && npx prisma generate --sql");
if (!genResult.success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}

console.log("Prisma client generated successfully.");
