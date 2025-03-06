// setup.cjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;

// If not running on Vercel (or in production), ensure docker-compose.yml exists.
if (!process.env.VERCEL) {
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
  console.log('Running on Vercel—skipping docker-compose setup.');
}

// Run generateModels.ts to update TypeScript models automatically
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
