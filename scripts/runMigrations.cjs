// scripts/runMigrations.cjs
const { execSync } = require('child_process');

function runCommandWithOutput(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    const output = execSync(cmd, { stdio: 'pipe' });
    const outStr = output.toString();
    console.log(`Command succeeded: ${cmd}`);
    return { success: true, output: outStr };
  } catch (error) {
    const output = error.stderr ? error.stderr.toString() : error.message;
    console.error(`Error running "${cmd}": ${output}`);
    return { success: false, output };
  }
}

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Command succeeded: ${cmd}`);
    return { success: true };
  } catch (error) {
    const output = error.stderr ? error.stderr.toString() : error.message;
    console.error(`Error running "${cmd}": ${output}`);
    return { success: false, message: output };
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

// 1) Test the database connection.
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// 2) Run Prisma migrations.
// We force a dev migration with a name "create_tenets" (and skip Prisma's seed) even in production.
const migrationCmd = "npx prisma migrate dev --name create_tenets --skip-seed --force";
console.log("Running Prisma migrations...");
const migrationResult = runCommandWithOutput(migrationCmd);
if (!migrationResult.success) {
  // Convert output to lowercase for a case-insensitive check.
  const outLower = migrationResult.output.toLowerCase();
  if (
    outLower.includes("no changes detected") ||
    outLower.includes("empty migration") ||
    outLower.includes("the migration will be empty")
  ) {
    console.log("No migration changes detected; proceeding without error.");
  } else if (outLower.includes("p3009")) {
    console.error("Detected migration error P3009. Please resolve migration conflicts.");
    process.exit(1);
  } else {
    console.error("Prisma migrations failed with an unexpected error. Exiting.");
    process.exit(1);
  }
} else {
  console.log("Prisma migrations applied successfully.");
}

// 3) Generate the Prisma client.
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
