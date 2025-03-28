import { cookies } from "next/headers";
import { verifyToken } from "./session";
import { unstable_cache } from "./unstable-cache";
import type { Client as PGClient } from 'pg';
import { isBuild, mockData, handleDbError } from "@/lib/db-fallback";

console.log(`In queries.ts - Environment: ${process.env.NODE_ENV}, Build phase: ${process.env.NEXT_PHASE}, isBuild: ${isBuild}`);

// Only import pg and create client if not in build
let pgClient: PGClient | undefined;
let sql: ((strings: TemplateStringsArray, ...values: any[]) => Promise<any>) | undefined;

// Define mock sql function for build time
if (isBuild) {
  // Mock implementation for build
  sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    console.log('Build-time mock database query:', strings.join('?'));
    // Return empty result for all queries during build
    return { rows: [] };
  };
} else {
  try {
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

    // Create a database client using the native pg library which works better with CockroachDB
    pgClient = new Client({
      connectionString,
      // Add these settings to improve reliability with CockroachDB
      query_timeout: 10000, // 10 seconds
      connectionTimeoutMillis: 5000, // 5 seconds
      // Ensure native TLS which works better with CockroachDB
      ssl: {
        rejectUnauthorized: true,
      }
    });

    // Connect immediately to verify the connection works
    if (pgClient) {
      pgClient.connect()
        .then(() => console.log('Successfully connected to CockroachDB'))
        .catch((err: Error) => console.error('Failed to connect to CockroachDB:', err.message));
    }

    // Helper function to execute SQL queries with proper TypeScript types
    sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      try {
        // Convert the tagged template to a parameterized query
        let query = '';
        let paramIndex = 1;
        let params = [];

        // Build the query string with $1, $2, etc. placeholders
        for (let i = 0; i < strings.length; i++) {
          query += strings[i];
          
          if (i < values.length) {
            query += `$${paramIndex}`;
            paramIndex++;
            params.push(values[i]);
          }
        }
        
        // Log the query for debugging (with sensitive data removed)
        const debugQuery = {
          text: query,
          params: params.map(v => typeof v === 'string' && v.length > 20 ? v.substring(0, 10) + '...' : v)
        };
        console.log('Executing query:', JSON.stringify(debugQuery));
        
        // Execute the query
        if (!pgClient) throw new Error('Database client not initialized');
        const result = await pgClient.query(query, params);
        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Database query error:', errorMessage);
        // Try to reconnect on connection errors
        if (errorMessage.includes('connection') || (error instanceof Error && 'code' in error && error.code === 'ECONNRESET')) {
          console.log('Attempting to reconnect...');
          try {
            if (!pgClient) throw new Error('Database client not initialized');
            await pgClient.end();
            await pgClient.connect();
            console.log('Reconnection successful');
          } catch (reconnectError: unknown) {
            console.error('Failed to reconnect:', reconnectError instanceof Error ? reconnectError.message : String(reconnectError));
          }
        }
        throw error;
      }
    };
  } catch (error) {
    console.error('Error initializing database client:', error);
    // Provide a fallback mock implementation if initialization fails
    sql = async () => ({ rows: [] });
  }
}

export async function getUser() {
  // During build time, return null for user
  if (isBuild) {
    console.log('Build-time getUser call, returning null');
    return null;
  }
  
  try {
    const sessionCookie = (await cookies()).get("session");
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const sessionData = await verifyToken(sessionCookie.value);
    if (
      !sessionData ||
      !sessionData.user ||
      typeof sessionData.user.id !== "number"
    ) {
      return null;
    }

    if (new Date(sessionData.expires) < new Date()) {
      return null;
    }

    if (!sql) {
      console.error('SQL query function not initialized');
      return null;
    }
    
    try {
      const { rows } = await sql`
        SELECT * FROM users WHERE id = ${sessionData.user.id} LIMIT 1
      `;
  
      if (rows.length === 0) {
        return null;
      }
  
      return rows[0];
    } catch (dbError) {
      return handleDbError(dbError);
    }
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

export const getProductsForSubcategory = unstable_cache(
  async (subcategorySlug: string) => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getProductsForSubcategory');
      return mockData.products;
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows } = await sql`
      SELECT * FROM products 
      WHERE subcategory_slug = ${subcategorySlug} 
      ORDER BY slug ASC
    `;
    return rows;
  },
  ["subcategory-products"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getCollections = unstable_cache(
  async () => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getCollections');
      return mockData.collections;
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows: collections } = await sql`
      SELECT * FROM collections ORDER BY name ASC
    `;
    
    const result = [];
    
    for (const collection of collections) {
      const { rows: categories } = await sql`
        SELECT * FROM categories WHERE collection_id = ${collection.id}
      `;
      
      result.push({
        ...collection,
        categories
      });
    }
    
    return result;
  },
  ["collections"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getProductDetails = unstable_cache(
  async (productSlug: string) => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getProductDetails');
      const mockProduct = mockData.products.find(p => p.slug === productSlug) || mockData.products[0];
      return mockProduct;
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows } = await sql`
      SELECT * FROM products WHERE slug = ${productSlug} LIMIT 1
    `;
    
    return rows.length > 0 ? rows[0] : null;
  },
  ["product"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getSubcategory = unstable_cache(
  async (subcategorySlug: string) => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getSubcategory');
      return mockData.subcategories[0];
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows } = await sql`
      SELECT * FROM subcategories WHERE slug = ${subcategorySlug} LIMIT 1
    `;
    
    return rows.length > 0 ? rows[0] : null;
  },
  ["subcategory"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getCategory = unstable_cache(
  async (categorySlug: string) => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getCategory');
      return {
        ...mockData.categories[0],
        subcollections: [{
          ...mockData.subcollections[0],
          subcategories: mockData.subcategories
        }]
      };
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows } = await sql`
      SELECT * FROM categories WHERE slug = ${categorySlug} LIMIT 1
    `;
    
    if (rows.length === 0) return null;
    
    const category = rows[0];
    
    const { rows: subcollections } = await sql`
      SELECT * FROM subcollections WHERE category_slug = ${category.slug}
    `;
    
    const subcollectionsWithSubcategories = [];
    
    for (const subcollection of subcollections) {
      const { rows: subcategories } = await sql`
        SELECT * FROM subcategories WHERE subcollection_id = ${subcollection.id}
      `;
      
      subcollectionsWithSubcategories.push({
        ...subcollection,
        subcategories
      });
    }
    
    return {
      ...category,
      subcollections: subcollectionsWithSubcategories
    };
  },
  ["category"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getCollectionDetails = unstable_cache(
  async (collectionSlug: string) => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getCollectionDetails');
      return mockData.collections;
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows: collections } = await sql`
      SELECT * FROM collections WHERE slug = ${collectionSlug} ORDER BY slug ASC
    `;
    
    const result = [];
    
    for (const collection of collections) {
      const { rows: categories } = await sql`
        SELECT * FROM categories WHERE collection_id = ${collection.id}
      `;
      
      result.push({
        ...collection,
        categories
      });
    }
    
    return result;
  },
  ["collection"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getProductCount = unstable_cache(
  async () => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getProductCount');
      return mockData.product_count;
    }
    
    if (!sql) throw new Error('SQL query function not initialized');
    const { rows } = await sql`
      SELECT COUNT(*) as count FROM products
    `;
    
    return rows[0];
  },
  ["product-count"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getCategoryProductCount = unstable_cache(
  async (categorySlug: string) => {
    const { rows } = await sql`
      SELECT COUNT(*) as count 
      FROM categories
      LEFT JOIN subcollections ON categories.slug = subcollections.category_slug
      LEFT JOIN subcategories ON subcollections.id = subcategories.subcollection_id
      LEFT JOIN products ON subcategories.slug = products.subcategory_slug
      WHERE categories.slug = ${categorySlug}
    `;
    
    return rows[0];
  },
  ["category-product-count"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getSubcategoryProductCount = unstable_cache(
  async (subcategorySlug: string) => {
    const { rows } = await sql`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE subcategory_slug = ${subcategorySlug}
    `;
    
    return rows[0];
  },
  ["subcategory-product-count"],
  {
    revalidate: 60 * 60 * 2, // two hours
  }
);

export const getSearchResults = unstable_cache(
  async (searchTerm: string) => {
    // Return mock data during build time
    if (isBuild) {
      console.log('Using mock data for getSearchResults');
      return mockData.products.slice(0, 5).map(product => ({
        products: product,
        subcategories: { slug: 'mock-subcategory', name: 'Mock Subcategory' },
        subcollections: { id: 1, name: 'Mock Subcollection' },
        categories: { slug: 'mock-category', name: 'Mock Category' }
      }));
    }

    // Simplify the search query to avoid complex joins that might time out
    try {
      // Clean the search term
      const cleanSearchTerm = searchTerm.replace(/[^\w\s]/gi, '').trim();
      
      if (!cleanSearchTerm) {
        return [];
      }
      
      // Use a simpler search with ILIKE for compatibility
      console.log('Executing search query with term:', cleanSearchTerm);
      const result = await sql`
        SELECT 
          p.slug, 
          p.name, 
          p.description, 
          p.price, 
          p.subcategory_slug,
          p.image_url,
          sc.name as subcategory_name,
          c.slug as category_slug,
          c.name as category_name
        FROM 
          products p
        JOIN 
          subcategories sc ON p.subcategory_slug = sc.slug
        JOIN 
          subcollections scol ON sc.subcollection_id = scol.id
        JOIN 
          categories c ON scol.category_slug = c.slug
        WHERE 
          p.name ILIKE ${'%' + cleanSearchTerm + '%'}
        LIMIT 10
      `;
      
      console.log(`Search for "${cleanSearchTerm}" found ${result.rows.length} results`);
      
      // Map the results to the expected structure
      return result.rows.map(row => ({
        products: {
          slug: row.slug,
          name: row.name,
          description: row.description,
          price: row.price,
          subcategory_slug: row.subcategory_slug,
          image_url: row.image_url
        },
        subcategories: {
          slug: row.subcategory_slug,
          name: row.subcategory_name
        },
        subcollections: {
          id: row.subcollection_id || 0,
          name: row.subcollection_name || 'Unknown'
        },
        categories: {
          slug: row.category_slug,
          name: row.category_name
        }
      }));
    } catch (error) {
      console.error('Search query error:', error);
      return [];
    }
  },
  ["search-results"],
  { revalidate: 60 * 5 } // 5 minutes instead of 2 hours
);

// Continue with the rest of the file...