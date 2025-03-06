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

console.log("Ensuring required schemas exist...");
// Execute the SQL file that creates the schemas.
if (runCommand("npx prisma db execute --file scripts/createSchemas.sql") !== true) {
  console.error("Failed to create required schemas.");
  process.exit(1);
}

console.log("Starting Prisma migrations...");
const migrationResult = runCommand("npx prisma migrate deploy");

if (migrationResult !== true) {
  // If migration still fails, exit with error.
  console.error("Migration deploy failed. Exiting.");
  process.exit(1);
}

console.log("Migrations applied successfully.");
