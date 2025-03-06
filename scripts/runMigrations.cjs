// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    // Using "inherit" so output is shown in real time.
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Command succeeded: ${cmd}`);
    return { success: true };
  } catch (err) {
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    console.error(`Error running "${cmd}": ${errorOutput}`);
    return { success: false, message: errorOutput };
  }
}

function testDatabaseConnection() {
  console.log("Testing database connection...");
  try {
    // Run a simple SQL query to ensure connection.
    execSync('echo "SELECT 1;" | npx prisma db execute --stdin', { stdio: 'inherit' });
    console.log("Database connection successful.");
    return true;
  } catch (err) {
    console.error("Database connection test failed:", err.message);
    return false;
  }
}

// ---------------- MAIN SCRIPT ---------------- //

// 1) Test DB connection
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// 2) Run Prisma migrations.
// On Vercel (production) use 'prisma migrate deploy'; locally use 'prisma migrate dev'.
const migrationCmd = process.env.VERCEL
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name auto_migration --skip-seed";

console.log("Starting Prisma migrations...");
if (!runCommand(migrationCmd).success) {
  console.error("Prisma migrations failed. Exiting.");
  process.exit(1);
}
console.log("Migrations applied successfully.");

// 3) Generate Prisma client
console.log("Generating Prisma client...");
if (!runCommand("npx prisma generate && npx prisma generate --sql").success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}
console.log("Prisma client generated successfully.");

// 4) Seed the database with import-playground.ts
console.log("Importing demo data with import-playground.ts...");
if (!runCommand("npx tsx ./import-playground.ts").success) {
  console.error("Error importing demo data. Exiting.");
  process.exit(1);
}
console.log("Demo data imported successfully.");

process.exit(0);
