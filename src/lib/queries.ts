import { cookies } from "next/headers";
import { verifyToken } from "./session";
import { unstable_cache } from "./unstable-cache";
import { Client } from 'pg';

// Determine which connection string to use
const connectionString = process.env.COCKROACH_DB_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('Missing database connection string. Please provide either COCKROACH_DB_URL or POSTGRES_URL in your environment variables.');
}

// Debug log connection string format (removes credentials for safety)
const debugConnectionString = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@');
console.log(`Database connection string format: ${debugConnectionString}`);

// Create a database client using the native pg library which works better with CockroachDB
const pgClient = new Client({
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
pgClient.connect()
  .then(() => console.log('Successfully connected to CockroachDB'))
  .catch((err: Error) => console.error('Failed to connect to CockroachDB:', err.message));

// Helper function to execute SQL queries with proper TypeScript types
const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
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
    const result = await pgClient.query(query, params);
    return result;
  } catch (error: any) {
    console.error('Database query error:', error.message);
    // Try to reconnect on connection errors
    if (error.message.includes('connection') || error.code === 'ECONNRESET') {
      console.log('Attempting to reconnect...');
      try {
        await pgClient.end();
        await pgClient.connect();
        console.log('Reconnection successful');
      } catch (reconnectError: any) {
        console.error('Failed to reconnect:', reconnectError.message);
      }
    }
    throw error;
  }
};

export async function getUser() {
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

  const { rows } = await sql`
    SELECT * FROM users WHERE id = ${sessionData.user.id} LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export const getProductsForSubcategory = unstable_cache(
  async (subcategorySlug: string) => {
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
    const { rows } = await sql`
      SELECT COUNT(*) as count FROM products
    `;
    
    return rows[0];
  },
  ["total-product-count"],
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
    let rows;

    // do we really need to do this hybrid search pattern?
    if (searchTerm.length <= 2) {
      // If the search term is short (e.g., "W"), use ILIKE for prefix matching
      const result = await sql`
        SELECT 
          p.*, 
          sc.slug as subcategory_slug, 
          sc.name as subcategory_name,
          scol.id as subcollection_id, 
          scol.name as subcollection_name,
          c.slug as category_slug, 
          c.name as category_name
        FROM products p
        INNER JOIN subcategories sc ON p.subcategory_slug = sc.slug
        INNER JOIN subcollections scol ON sc.subcollection_id = scol.id
        INNER JOIN categories c ON scol.category_slug = c.slug
        WHERE p.name ILIKE ${searchTerm + '%'}
        LIMIT 5
      `;
      
      rows = result.rows;
    } else {
      // For longer search terms, use full-text search with tsquery
      const formattedSearchTerm = searchTerm
        .split(" ")
        .filter((term) => term.trim() !== "") // Filter out empty terms
        .map((term) => `${term}:*`)
        .join(" & ");

      const result = await sql`
        SELECT 
          p.*, 
          sc.slug as subcategory_slug, 
          sc.name as subcategory_name,
          scol.id as subcollection_id, 
          scol.name as subcollection_name,
          c.slug as category_slug, 
          c.name as category_name
        FROM products p
        INNER JOIN subcategories sc ON p.subcategory_slug = sc.slug
        INNER JOIN subcollections scol ON sc.subcollection_id = scol.id
        INNER JOIN categories c ON scol.category_slug = c.slug
        WHERE to_tsvector('english', p.name) @@ to_tsquery('english', ${formattedSearchTerm})
        LIMIT 5
      `;
      
      rows = result.rows;
    }

    return rows.map((row: any) => ({
      product: {
        slug: row.slug,
        name: row.name,
        description: row.description,
        price: row.price,
        subcategory_slug: row.subcategory_slug,
        image_url: row.image_url
      },
      subcategory: {
        slug: row.subcategory_slug,
        name: row.subcategory_name
      },
      subcollection: {
        id: row.subcollection_id,
        name: row.subcollection_name
      },
      category: {
        slug: row.category_slug,
        name: row.category_name
      }
    }));
  },
  ["search-results"],
  { revalidate: 60 * 60 * 2 } // two hours
);

// Continue with the rest of the file...