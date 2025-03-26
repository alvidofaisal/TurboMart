#!/usr/bin/env node
// This script restores a CockroachDB database backup to a new account

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const COCKROACH_DB_URL = process.env.COCKROACH_DB_URL;
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backup');

// Check for backup filename argument
const backupFilename = process.argv[2];

if (!backupFilename) {
  console.error('Error: No backup filename provided.');
  console.error('Usage: node db-restore.js <backup-filename>');
  console.error(`Available backups in ${BACKUP_DIR}:`);
  
  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse(); // Most recent first
      
    if (files.length === 0) {
      console.error('  No backup files found.');
    } else {
      files.forEach(file => console.error(`  - ${file}`));
    }
  } else {
    console.error('  Backup directory does not exist.');
  }
  
  process.exit(1);
}

const BACKUP_PATH = path.join(BACKUP_DIR, backupFilename);

// Check if backup file exists
if (!fs.existsSync(BACKUP_PATH)) {
  console.error(`Error: Backup file not found: ${BACKUP_PATH}`);
  process.exit(1);
}

try {
  console.log(`Restoring CockroachDB from backup: ${BACKUP_PATH}`);
  
  // First create the schema and required extensions
  console.log('Creating database schema...');
  const createSchemaCmd = `psql "${COCKROACH_DB_URL}" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"`;
  console.log(`Running: ${createSchemaCmd.replace(COCKROACH_DB_URL, '[REDACTED]')}`);
  execSync(createSchemaCmd, { stdio: 'inherit', shell: true });
  
  // Create required roles
  console.log('Creating required roles...');
  const createRolesCmd = `psql "${COCKROACH_DB_URL}" -c "CREATE ROLE IF NOT EXISTS default; CREATE ROLE IF NOT EXISTS cloud_admin;"`;
  console.log(`Running: ${createRolesCmd.replace(COCKROACH_DB_URL, '[REDACTED]')}`);
  execSync(createRolesCmd, { stdio: 'inherit', shell: true });
  
  // Restore the backup
  console.log('Restoring data from backup...');
  const restoreCmd = `psql "${COCKROACH_DB_URL}" -f "${BACKUP_PATH}"`;
  console.log(`Running: ${restoreCmd.replace(COCKROACH_DB_URL, '[REDACTED]')}`);
  execSync(restoreCmd, { stdio: 'inherit', shell: true });
  
  console.log('\nRestore completed successfully.');
  console.log('Next steps:');
  console.log('1. Verify data integrity with: pnpm db:studio');
  console.log('2. Update any environment variables if necessary');
  console.log('3. Start the application: pnpm dev');
  
} catch (error) {
  console.error('Error during restore:', error.message);
  process.exit(1);
} 