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

console.log("Starting Prisma migrations...");
const migrationResult = runCommand("npx prisma migrate deploy");

if (migrationResult !== true) {
  // Check if the error message indicates a failed migration (P3009)
  if (migrationResult.message && migrationResult.message.includes("P3009")) {
    console.error("Detected failed migration (P3009). Clearing problematic state and retrying...");

    const clearResult = runCommand("npx prisma db execute --file cleardb.sql");
    if (clearResult !== true) {
      console.error("Error clearing database. Exiting.");
      process.exit(1);
    }

    const retryResult = runCommand("npx prisma migrate deploy");
    if (retryResult !== true) {
      console.error("Error re-applying migrations after clearing database. Exiting.");
      process.exit(1);
    }

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
