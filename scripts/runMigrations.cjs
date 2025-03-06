// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`Error running "${cmd}":`, err.message);
    return err;
  }
}

// Step 1: Ensure required schemas exist
console.log("Ensuring required schemas exist...");
if (runCommand("npx prisma db execute --file scripts/createSchemas.sql") !== true) {
  console.error("Failed to create required schemas. Exiting.");
  process.exit(1);
}

// Step 2: Attempt to deploy migrations
console.log("Starting Prisma migrations...");
let migrationResult = runCommand("npx prisma migrate deploy");

if (migrationResult !== true) {
  // Check if the error message indicates a failed migration (P3009)
  if (migrationResult.message && migrationResult.message.includes("P3009")) {
    console.error("Detected failed migration (P3009).");
    // Mark the failed migration as applied so that Prisma won't block further migrations.
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Attempting to mark migration as applied: ${resolveCmd}`);
    const resolveResult = runCommand(resolveCmd);
    if (resolveResult !== true) {
      console.error("Failed to resolve the migration automatically. Exiting.");
      process.exit(1);
    }
    console.log("Migration marked as applied. Re-running migrations...");
    migrationResult = runCommand("npx prisma migrate deploy");
    if (migrationResult !== true) {
      console.error("Migrations still failing after resolving. Exiting.");
      process.exit(1);
    }
    // Optionally, import demo data if needed.
    console.log("Optionally importing demo data...");
    const importResult = runCommand("npx tsx ./import-playground.ts");
    if (importResult !== true) {
      console.error("Error importing demo data. Exiting.");
      process.exit(1);
    }
  } else {
    console.error("Migration deploy failed with an unexpected error. Exiting.");
    process.exit(1);
  }
}

console.log("Migrations applied successfully.");
