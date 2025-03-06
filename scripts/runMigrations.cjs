// scripts/runMigrations.js
const { execSync } = require('child_process');

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  console.log("Attempting prisma migrate deploy...");
  runCommand("npx prisma migrate deploy");
  console.log("Migrations applied successfully.");
} catch (err) {
  // Check for error code P3009 (failed migration)
  if (err.message.includes("P3009")) {
    console.error("Detected failed migrations (P3009).");
    console.error("Clearing database and re-applying migrations...");
    try {
      // Run your cleardb.sql to reset the database
      runCommand("npx prisma db execute --file cleardb.sql");
      console.log("Database cleared successfully.");
      // Re-run migrations
      runCommand("npx prisma migrate deploy");
      console.log("Migrations applied successfully after clearing DB.");
      // Optionally, import demo data if needed
      runCommand("npx tsx ./import-playground.ts");
      console.log("Demo data imported successfully.");
    } catch (innerErr) {
      console.error("Error during DB clear and migration re-run:", innerErr);
      process.exit(1);
    }
  } else {
    console.error("Migration deploy failed:", err);
    process.exit(1);
  }
}
