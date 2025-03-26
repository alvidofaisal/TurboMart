import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";
import { isBuild, mockDbUrl } from "@/lib/db-fallback";

// Log build environment
console.log(`Environment: ${process.env.NODE_ENV}, Build phase: ${process.env.NEXT_PHASE}, isBuild: ${isBuild}`);

// Make sure we have a connection string 
const connectionString = isBuild 
  ? mockDbUrl // Use mock URL from fallback during build
  : (process.env.COCKROACH_DB_URL || process.env.POSTGRES_URL || '');

if (!connectionString) {
  throw new Error('Missing database connection string (COCKROACH_DB_URL or POSTGRES_URL)');
}

// Create a PostgreSQL client with CockroachDB connection
let client: ReturnType<typeof postgres> | null = null;

try {
  // Only create a real client if not in build
  if (!isBuild && connectionString) {
    client = postgres(connectionString, {
      ssl: true,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
    console.log('Using postgres-js connection to CockroachDB');
  } else {
    console.log('Using mock database client for build');
  }
} catch (error) {
  console.error('Failed to initialize database client:', error);
}

// Create and export the Drizzle ORM instance
// Use a mock db instance during build or if client is null
export const db = client ? drizzle(client, { schema }) : {
  // Mock implementation that returns empty arrays for all queries
  query: () => Promise.resolve([]),
  select: () => ({ from: () => Promise.resolve([]) }),
  insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
  update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
  delete: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) })
};
