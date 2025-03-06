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
  console.log(`Sleeping ${seconds} second(s) ...`);
  try {
    execSync(`sleep ${seconds}`);
  } catch {
    // Windows or minimal shells may lack `sleep`. Replace with setTimeout if needed.
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

// -------- MAIN SCRIPT -------- //

// Step A: Test DB connection
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// Step B: Run migrations (local dev => migrate dev, on Vercel => migrate deploy)
const migrationCmd = process.env.VERCEL
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name auto_migration --skip-seed";

console.log("Starting Prisma migrations...");
let migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  // If we encounter a known issue like P3009, handle it
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
    console.error("Migration step failed with an unexpected error. Exiting.");
    process.exit(1);
  }
}

console.log("Migrations applied successfully.");

// Step C: Clear data (DELETE all rows from tables, but keep the schema)
console.log("Clearing existing data via cleardb.sql (non-destructive to schema)...");
let clearDbResult = runCommand("npx prisma db execute --file scripts/cleardb.sql");
if (!clearDbResult.success) {
  console.error("Failed to clear existing data. Exiting.");
  process.exit(1);
}
console.log("Data cleared successfully.");

// Optionally wait a few seconds after clearing data
sleep(2);

// Step D: Generate Prisma client
console.log("Generating Prisma client...");
const genResult = runCommand("npx prisma generate && npx prisma generate --sql");
if (!genResult.success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}
console.log("Prisma client generated successfully.");

// Step E: Seed the DB with import-playground.ts
console.log("Importing demo data with import-playground.ts...");
const importResult = runCommand("npx tsx ./import-playground.ts");
if (!importResult.success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}
console.log("Demo data imported successfully.");

// Done
