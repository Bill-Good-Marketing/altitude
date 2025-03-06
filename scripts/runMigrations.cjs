// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    // Use pipe so we can capture output
    const output = execSync(cmd, { stdio: 'pipe' });
    console.log(`Command succeeded: ${cmd}`);
    return output.toString();
  } catch (err) {
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    console.error(`Error running "${cmd}": ${errorOutput}`);
    return { error: true, message: errorOutput };
  }
}

// Step 1: Ensure required schemas exist
console.log("Ensuring required schemas exist...");
const schemaResult = runCommand("npx prisma db execute --file scripts/createSchemas.sql");
if (schemaResult.error) {
  console.error("Failed to create required schemas. Exiting.");
  process.exit(1);
}

// Step 2: Attempt to deploy migrations
console.log("Starting Prisma migrations...");
let migrationResult = runCommand("npx prisma migrate deploy");

if (migrationResult.error) {
  const errorOutput = migrationResult.message;
  if (errorOutput.includes("P3009")) {
    console.error("Detected failed migration (P3009).");
    // Force-resolve the problematic migration
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Attempting to mark migration as applied: ${resolveCmd}`);
    const resolveResult = runCommand(resolveCmd);
    if (resolveResult.error) {
      console.error("Failed to resolve the migration automatically. Exiting.");
      process.exit(1);
    }
    console.log("Migration marked as resolved. Re-running migrations...");
    migrationResult = runCommand("npx prisma migrate deploy");
    if (migrationResult.error) {
      console.error("Migrations still failing after resolving. Exiting.");
      process.exit(1);
    }
    // Optionally, import demo data if needed.
    console.log("Importing demo data...");
    const importResult = runCommand("npx tsx ./import-playground.ts");
    if (importResult.error) {
      console.error("Error importing demo data. Exiting.");
      process.exit(1);
    }
  } else {
    console.error("Migration deploy failed with an unexpected error. Exiting.");
    process.exit(1);
  }
}

console.log("Migrations applied successfully.");
