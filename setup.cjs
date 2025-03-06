// setup.cjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;

if (!process.env.VERCEL) {
  // Local development: Ensure docker-compose.yml exists and run Docker
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  if (!fs.existsSync(dockerComposePath)) {
    const dockerComposeContent = `
version: '3'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: web
      POSTGRES_PASSWORD: password
      POSTGRES_DB: altitudecrm
    ports:
      - "5432:5432"
    `;
    fs.writeFileSync(dockerComposePath, dockerComposeContent.trim());
    console.log('Created docker-compose.yml');
  } else {
    console.log('docker-compose.yml already exists.');
  }
} else {
  // Production on Vercel: Skip docker-compose setup.
  console.log('Running on Vercel—skipping docker-compose setup.');
  
  // Determine Neon host and port.
  let neonHost = process.env.NEON_HOST;
  let neonPort = process.env.NEON_PORT;
  
  if (!neonHost || !neonPort) {
    console.warn('NEON_HOST or NEON_PORT not defined; attempting to parse DATABASE_URL...');
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const matches = dbUrl.match(/@([^:]+):(\d+)\//);
      if (matches && matches.length >= 3) {
        neonHost = matches[1];
        neonPort = matches[2];
        console.log(`Parsed Neon host: ${neonHost}, port: ${neonPort}`);
      } else {
        console.warn('Could not parse Neon host/port from DATABASE_URL.');
      }
    } else {
      console.warn('DATABASE_URL is not defined.');
    }
  }
  
  if (neonHost && neonPort) {
    console.log(`Waiting for Neon DB at ${neonHost}:${neonPort}...`);
    try {
      // Wait up to 30 seconds for the Neon DB to be ready.
      execSync(`npx wait-on tcp:${neonHost}:${neonPort}`, { stdio: 'inherit' });
      console.log('Neon DB is ready.');
    } catch (err) {
      console.error("Database connection did not become ready in time:", err);
      process.exit(1);
    }
    
    // Run Prisma migrations.
    try {
      console.log("Running Prisma migrations...");
      execSync("npx prisma migrate deploy", { stdio: 'inherit' });
      console.log("Migrations applied successfully.");
    } catch (err) {
      console.error("Error running Prisma migrations:", err);
      process.exit(1);
    }
  } else {
    console.warn("NEON_HOST and NEON_PORT could not be determined. Skipping DB wait and migrations.");
  }
}

// Run generateModels.ts to update TypeScript models automatically.
try {
  console.log('Running generateModels.ts to update models...');
  execSync('npx tsx ./generateModels.ts', { stdio: 'inherit' });
  console.log('Model generation complete.');
} catch (err) {
  console.error('Error running generateModels.ts:', err);
  // Uncomment the next line if model generation is critical:
  // process.exit(1);
}

console.log('Setup complete. You can now run npm run dev.');
