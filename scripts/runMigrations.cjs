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
    // Ignore errors
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

// ----- Main Script Execution -----

// Step 0: Test the Neon database connection.
if (!testDatabaseConnection()) {
  console.error("Cannot connect to the Neon database using DATABASE_URL. Exiting.");
  process.exit(1);
}

// Step 1: Ensure required schemas exist.
console.log("Ensuring required schemas exist...");
const schemaResult = runCommand("npx prisma db execute --file ../srccreateSchemas.sql");
if (!schemaResult.success) {
  console.error("Failed to create required schemas. Exiting.");
  process.exit(1);
}

// Step 2: Wait 5 seconds to ensure database is fully initialized.
console.log("Waiting 5 seconds to ensure database is fully initialized...");
sleep(5);

// Step 3: Run migrations.
let migrationCmd = process.env.VERCEL
  ? "npx prisma migrate deploy"
  : "npx prisma migrate dev --name auto_migration --skip-seed";

console.log("Starting Prisma migrations...");
let migrationResult = runCommand(migrationCmd);
if (!migrationResult.success) {
  if (migrationResult.message.includes("P3009")) {
    console.error("Detected failed migration (P3009).");
    const resolveCmd = 'npx prisma migrate resolve --applied "20250304001229_crm_addresses"';
    console.log(`Attempting to mark migration as applied: ${resolveCmd}`);
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
    console.log("Importing demo data using seed.ts...");
    const seedResult = runCommand("npx tsx seed.ts");
    if (!seedResult.success) {
      console.error("Error importing demo data. Exiting.");
      process.exit(1);
    }
  } else {
    console.error("Migration deploy failed with an unexpected error. Exiting.");
    process.exit(1);
  }
} else {
  console.log("Migrations applied successfully.");
  console.log("Seeding demo data using seed.ts...");
  const seedResult = runCommand("npx tsx seed.ts");
  if (!seedResult.success) {
    console.error("Error seeding demo data. Exiting.");
    process.exit(1);
  }
}

// Step 4: Ensure required tables exist.
// Ensure crm.addresses table.
console.log("Ensuring crm.addresses table exists...");
const ensureAddressesResult = runCommand("npx prisma db execute --file ../srcensureAddresses.sql");
if (!ensureAddressesResult.success) {
  console.error("Failed to ensure crm.addresses table exists. Exiting.");
  process.exit(1);
}

// Ensure crm.tz_data table (drop & recreate).
console.log("Ensuring crm.tz_data table exists...");
const ensureTzResult = runCommand("npx prisma db execute --file ../srcensureTzData.sql");
if (!ensureTzResult.success) {
  console.error("Failed to ensure crm.tz_data table exists. Exiting.");
  process.exit(1);
}

// Step 5: Execute updateTZ.sql to update timezone data.
console.log("Executing updateTZ.sql to update timezone data...");
const updateTZResult = runCommand("npx prisma db execute --file prisma/sql/updateTZ.sql");
if (!updateTZResult.success) {
  console.error("Failed to execute updateTZ.sql. Exiting.");
  process.exit(1);
}

// Step 6: Generate the Prisma client with SQL support.
console.log("Generating Prisma client with SQL support...");
const genResult = runCommand("npx prisma generate && npx prisma generate --sql");
if (!genResult.success) {
  console.error("Failed to generate Prisma client. Exiting.");
  process.exit(1);
}
console.log("Prisma client generated successfully.");
