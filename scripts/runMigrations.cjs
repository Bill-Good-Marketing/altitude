// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    // Using 'inherit' so output streams directly to the console.
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Command succeeded: ${cmd}`);
    return { success: true };
  } catch (err) {
    console.error(`Error running "${cmd}":`, err.message);
    return { success: false, message: err.message };
  }
}

function testDatabaseConnection() {
  console.log("Testing database connection...");
  try {
    // This command runs a simple query via Prisma.
    execSync('echo "SELECT 1;" | npx prisma db execute --stdin', { stdio: 'inherit' });
    console.log("Database connection successful.");
    return true;
  } catch (err) {
    console.error("Database connection test failed:", err.message);
    return false;
  }
}

if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

console.log("Running Prisma migrations...");
// On production, Vercel sets process.env.VERCEL, so this uses 'prisma migrate deploy'.
const migrationCmd = process.env.VERCEL
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name auto_migration --skip-seed";

if (!runCommand(migrationCmd).success) {
  console.error("Prisma migrations failed. Exiting.");
  process.exit(1);
}

console.log("Generating Prisma client...");
// Generate the Prisma client; the "--sql" flag is optional if needed.
if (!runCommand("npx prisma generate && npx prisma generate --sql").success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}

console.log("Seeding database with import-playground.ts...");
// Finally, seed the database.
if (!runCommand("npx tsx ./import-playground.ts").success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}

console.log("Migration and seeding complete.");
process.exit(0);
