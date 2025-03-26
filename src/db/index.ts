import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";

// Make sure we have a connection string 
const connectionString = process.env.COCKROACH_DB_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('Missing database connection string (COCKROACH_DB_URL or POSTGRES_URL)');
}

// Create a PostgreSQL client with CockroachDB connection
// Using postgres-js instead of node-postgres for better compatibility
const client = postgres(connectionString, {
  ssl: true,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Log successful connection
console.log('Using postgres-js connection to CockroachDB');

// Create and export the Drizzle ORM instance
export const db = drizzle(client, { schema });
