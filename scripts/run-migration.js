// Script to run custom CockroachDB migration
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const migrationFile = path.join(__dirname, '../src/db/migration.sql');
const dbUrl = process.env.COCKROACH_DB_URL;

if (!dbUrl) {
  console.error('Error: COCKROACH_DB_URL environment variable not set');
  process.exit(1);
}

// Create temporary file with connection string for psql
const tmpFile = path.join(__dirname, '.psql_tmp');
fs.writeFileSync(tmpFile, dbUrl);

try {
  console.log('Running migration...');
  // Use psql with the connection string to execute the migration
  execSync(`psql "$(cat ${tmpFile})" -f ${migrationFile}`, { stdio: 'inherit' });
  console.log('Migration completed successfully');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary file
  fs.unlinkSync(tmpFile);
} 