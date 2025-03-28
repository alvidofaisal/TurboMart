import type { Client as PGClient } from 'pg';
import { isBuild, isProductionRuntime } from './db-fallback';

let pgClient: PGClient | undefined;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

/**
 * Gets a database client with automatic retry logic
 * This helper ensures we have the most reliable database connection possible
 */
export async function getDbClient(): Promise<PGClient | null> {
  if (isBuild && !isProductionRuntime) {
    console.log('Build-time database client requested, returning null');
    return null;
  }
  
  // If we already have a connected client, return it
  if (pgClient) {
    try {
      // Test the connection with a simple query
      await pgClient.query('SELECT 1');
      return pgClient;
    } catch (error) {
      console.log('Existing database connection failed, will establish a new one');
      // Connection failed, we'll create a new one below
    }
  }
  
  if (connectionAttempts >= MAX_RETRIES) {
    console.error(`Maximum database connection attempts (${MAX_RETRIES}) reached`);
    return null;
  }
  
  try {
    connectionAttempts++;
    console.log(`Establishing database connection (attempt ${connectionAttempts}/${MAX_RETRIES})`);
    
    // Lazy import Client to avoid issues during build
    const { Client } = require('pg');
    
    // Determine which connection string to use
    const connectionString = process.env.COCKROACH_DB_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Missing database connection string (COCKROACH_DB_URL or POSTGRES_URL)');
    }
    
    // Debug log connection string format (removes credentials for safety)
    const debugConnectionString = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@');
    console.log(`Database connection string format: ${debugConnectionString}`);
    
    // Create a database client with optimized settings
    pgClient = new Client({
      connectionString,
      query_timeout: 10000, // 10 seconds
      connectionTimeoutMillis: 5000, // 5 seconds
      ssl: {
        rejectUnauthorized: true,
      }
    });
    
    // Connect immediately
    await pgClient.connect();
    console.log('Successfully connected to database');
    
    // Successful connection resets the retry counter
    connectionAttempts = 0;
    
    return pgClient;
  } catch (error) {
    console.error('Error establishing database connection:', error);
    return null;
  }
}

/**
 * Safely executes a database query with proper error handling
 */
export async function executeQuery(
  queryFn: (client: PGClient) => Promise<any>, 
  fallbackValue: any = null
): Promise<any> {
  try {
    const client = await getDbClient();
    if (!client) {
      console.log('No database client available, returning fallback value');
      return fallbackValue;
    }
    
    return await queryFn(client);
  } catch (error) {
    console.error('Database query error:', error);
    return fallbackValue;
  }
} 