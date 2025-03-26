// This file provides fallbacks for database connections during build

// Detect if we're in a build environment
export const isBuild = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';

// Mock database URL for build time
export const mockDbUrl = 'postgres://mock:mock@localhost:5432/mock_db';

// Override environment variables during build
if (isBuild && (!process.env.COCKROACH_DB_URL || !process.env.POSTGRES_URL)) {
  console.log('Setting mock database URLs for build');
  process.env.COCKROACH_DB_URL = mockDbUrl;
  process.env.POSTGRES_URL = mockDbUrl;
}

// Handle database connection errors gracefully
export function handleDbError(error: unknown): null {
  console.error('Database error:', error);
  return null;
}

// Default mock data
export const mockData = {
  users: [{ id: 1, name: 'Mock User', email: 'mock@example.com', username: 'mockuser' }],
  products: Array(10).fill(0).map((_, i) => ({
    id: i,
    name: `Mock Product ${i}`,
    slug: `mock-product-${i}`,
    subcategory_slug: 'mock-subcategory',
    price: 99.99,
    description: 'Mock description',
    image_url: '/placeholder.svg'
  })),
  collections: [
    {
      id: 1,
      name: 'Mock Collection',
      slug: 'mock-collection',
      categories: [
        { id: 1, name: 'Mock Category', slug: 'mock-category', collection_id: 1, image_url: '/placeholder.svg' }
      ]
    }
  ],
  categories: [
    { id: 1, name: 'Mock Category', slug: 'mock-category', collection_id: 1, image_url: '/placeholder.svg' }
  ],
  subcollections: [
    { id: 1, name: 'Mock Subcollection', slug: 'mock-subcollection', category_slug: 'mock-category' }
  ],
  subcategories: [
    { id: 1, name: 'Mock Subcategory', slug: 'mock-subcategory', subcollection_id: 1 }
  ],
  product_count: { count: 1000000 }
}; 