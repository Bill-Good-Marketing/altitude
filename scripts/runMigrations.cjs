// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Command succeeded: ${cmd}`);
    return { success: true };
  } catch (error) {
    const errorOutput = error.stderr ? error.stderr.toString() : error.message;
    console.error(`Error running "${cmd}": ${errorOutput}`);
    return { success: false, message: errorOutput };
  }
}

function testDatabaseConnection() {
  console.log("Testing database connection...");
  try {
    execSync('echo "SELECT 1;" | npx prisma db execute --stdin', { stdio: 'inherit' });
    console.log("Database connection successful.");
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error.message);
    return false;
  }
}

console.log("Starting migration and seed process...");

// 1) Test DB connection.
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// 2) Run Prisma migrations.
// In production (Vercel), you might use 'prisma migrate deploy'
// Here we force a dev migration so that if there are changes (e.g. creation of Tenet) it runs.
const migrationCmd = "npx prisma migrate dev --name create_tenets --skip-seed --force";
console.log("Running Prisma migrations...");
const migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  console.error("Prisma migrations failed. Exiting.");
  process.exit(1);
}
console.log("Prisma migrations applied successfully.");

// 3) Generate Prisma client.
console.log("Generating Prisma client with SQL support...");
if (!runCommand("npx prisma generate && npx prisma generate --sql").success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}
console.log("Prisma client generated successfully.");

// 4) Seed the database using import-playground.ts.
console.log("Seeding database with import-playground.ts...");
if (!runCommand("npx tsx ./import-playground.ts").success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}
console.log("Demo data imported successfully.");

process.exit(0);
