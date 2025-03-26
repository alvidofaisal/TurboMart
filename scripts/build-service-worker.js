#!/usr/bin/env node
// This script builds the service worker from TypeScript and copies it to the public directory

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '..', 'src', 'app', 'service-worker.ts');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'service-worker.js');

console.log('Building service worker...');

try {
  // Create a temporary file for the TypeScript compiler
  const tsConfig = {
    compilerOptions: {
      target: "es2020",
      module: "esnext",
      lib: ["es2020", "webworker", "dom"],
      moduleResolution: "node",
      strict: true,
      skipLibCheck: true,
      noEmit: false,
      outDir: OUTPUT_DIR,
    },
    include: [SOURCE_FILE],
    exclude: ["node_modules"]
  };

  const tempConfigPath = path.join(__dirname, 'temp-sw-tsconfig.json');
  fs.writeFileSync(tempConfigPath, JSON.stringify(tsConfig, null, 2));

  // Compile the service worker TypeScript file
  execSync(`npx tsc --project ${tempConfigPath}`, { stdio: 'inherit' });

  console.log(`Service worker compiled and written to ${OUTPUT_FILE}`);

  // Clean up temporary config file
  fs.unlinkSync(tempConfigPath);

  // Add cache busting comment with timestamp
  const compiledSW = fs.readFileSync(OUTPUT_FILE, 'utf8');
  const timestamp = new Date().toISOString();
  const updatedSW = `// Built on: ${timestamp}\n${compiledSW}`;
  fs.writeFileSync(OUTPUT_FILE, updatedSW);

  console.log('Service worker build completed successfully.');

} catch (error) {
  console.error('Error building service worker:', error);
  process.exit(1);
} 