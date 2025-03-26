#!/usr/bin/env node
// This script performs a backup of the CockroachDB database
// to be used before cycling to a new account

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const COCKROACH_DB_URL = process.env.COCKROACH_DB_URL;
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backup');
const DATE_STRING = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
const BACKUP_FILENAME = `turbomart-backup-${DATE_STRING}.sql`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_FILENAME);

// Create backup directory if it doesn't exist
console.log(`Creating backup directory: ${BACKUP_DIR}`);
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

try {
  console.log('Starting CockroachDB backup...');
  
  // Execute pg_dump with CockroachDB connection string
  const pgDumpCmd = `pg_dump "${COCKROACH_DB_URL}" > "${BACKUP_PATH}"`;
  console.log(`Running: ${pgDumpCmd.replace(COCKROACH_DB_URL, '[REDACTED]')}`);
  
  execSync(pgDumpCmd, { stdio: 'inherit', shell: true });
  
  console.log(`Backup completed successfully: ${BACKUP_PATH}`);
  console.log(`Backup file size: ${(fs.statSync(BACKUP_PATH).size / 1048576).toFixed(2)} MB`);
  
  // Additional step: create an env file template for the new account
  const ENV_TEMPLATE_PATH = path.join(BACKUP_DIR, `env-template-${DATE_STRING}.txt`);
  const envContent = `
# TurboMart Environment Template for new CockroachDB account
# Generated on: ${new Date().toISOString()}
# 
# Instructions:
# 1. Set up a new CockroachDB account
# 2. Create a new cluster and obtain connection string
# 3. Fill in the values below
# 4. Rename to .env.local

# Database
COCKROACH_DB_URL=<new-cockroach-connection-string>

# Supabase (keep the same)
SUPABASE_URL=${process.env.SUPABASE_URL || '<supabase-url>'}
SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY || '<supabase-anon-key>'}

# R2 Storage (keep the same)
NEXT_PUBLIC_R2_ENDPOINT=${process.env.NEXT_PUBLIC_R2_ENDPOINT || '<r2-endpoint>'}
NEXT_PUBLIC_R2_BUCKET_NAME=${process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'turbomart-images'}
R2_ACCESS_KEY=${process.env.R2_ACCESS_KEY || '<r2-access-key>'}
R2_SECRET_KEY=${process.env.R2_SECRET_KEY || '<r2-secret-key>'}
  `;
  
  fs.writeFileSync(ENV_TEMPLATE_PATH, envContent.trim());
  console.log(`Environment template created: ${ENV_TEMPLATE_PATH}`);
  
  console.log('\nBackup process completed. To restore on a new account:');
  console.log('1. Create a new CockroachDB account');
  console.log('2. Set up a new cluster');
  console.log('3. Update .env.local with the new connection string');
  console.log(`4. Run: pnpm db:restore ${BACKUP_FILENAME}`);
  
} catch (error) {
  console.error('Error during backup:', error.message);
  process.exit(1);
} 