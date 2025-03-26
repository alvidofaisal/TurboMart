/**
 * Cloudflare KV Cache Implementation for TurboMart
 * 
 * This module provides utilities for caching using Cloudflare KV storage
 * Used in both Cloudflare Workers and Next.js application
 */

// KV Cache TTL defaults (in seconds)
const DEFAULT_TTL = {
  short: 60, // 1 minute
  medium: 3600, // 1 hour
  long: 86400, // 1 day
  permanent: 2592000, // 30 days
};

// Cache key prefixes for different types of data
const KEY_PREFIX = {
  product: 'product:',
  category: 'category:',
  search: 'search:',
  user: 'user:',
};

/**
 * Get a value from the KV cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  // When running in Cloudflare Workers environment
  if (typeof TURBOMART_CACHE !== 'undefined') {
    try {
      return await TURBOMART_CACHE.get<T>(key, { type: 'json' });
    } catch (error) {
      console.error(`KV cache get error for key ${key}:`, error);
      return null;
    }
  }
  
  // When running in Next.js/Node.js environment
  // Fallback to using the KV REST API
  try {
    const kv_url = process.env.CLOUDFLARE_KV_API_URL;
    const kv_token = process.env.CLOUDFLARE_KV_API_TOKEN;
    
    if (!kv_url || !kv_token) {
      return null;
    }
    
    const response = await fetch(`${kv_url}/values/${encodeURIComponent(key)}`, {
      headers: {
        'Authorization': `Bearer ${kv_token}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`KV REST API get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in the KV cache
 */
export async function setInCache(key: string, value: unknown, ttl: number = DEFAULT_TTL.medium): Promise<boolean> {
  // When running in Cloudflare Workers environment
  if (typeof TURBOMART_CACHE !== 'undefined') {
    try {
      await TURBOMART_CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl });
      return true;
    } catch (error) {
      console.error(`KV cache set error for key ${key}:`, error);
      return false;
    }
  }
  
  // When running in Next.js/Node.js environment
  // Fallback to using the KV REST API
  try {
    const kv_url = process.env.CLOUDFLARE_KV_API_URL;
    const kv_token = process.env.CLOUDFLARE_KV_API_TOKEN;
    
    if (!kv_url || !kv_token) {
      return false;
    }
    
    const response = await fetch(`${kv_url}/values/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${kv_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(value),
        expiration_ttl: ttl,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error(`KV REST API set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete a value from the KV cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  // When running in Cloudflare Workers environment
  if (typeof TURBOMART_CACHE !== 'undefined') {
    try {
      await TURBOMART_CACHE.delete(key);
      return true;
    } catch (error) {
      console.error(`KV cache delete error for key ${key}:`, error);
      return false;
    }
  }
  
  // When running in Next.js/Node.js environment
  // Fallback to using the KV REST API
  try {
    const kv_url = process.env.CLOUDFLARE_KV_API_URL;
    const kv_token = process.env.CLOUDFLARE_KV_API_TOKEN;
    
    if (!kv_url || !kv_token) {
      return false;
    }
    
    const response = await fetch(`${kv_url}/values/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${kv_token}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error(`KV REST API delete error for key ${key}:`, error);
    return false;
  }
}

// Helper functions for common cache operations
export const productCache = {
  get: <T>(slug: string) => getFromCache<T>(`${KEY_PREFIX.product}${slug}`),
  set: (slug: string, data: unknown, ttl = DEFAULT_TTL.medium) => 
    setInCache(`${KEY_PREFIX.product}${slug}`, data, ttl),
  delete: (slug: string) => deleteFromCache(`${KEY_PREFIX.product}${slug}`),
};

export const categoryCache = {
  get: <T>(slug: string) => getFromCache<T>(`${KEY_PREFIX.category}${slug}`),
  set: (slug: string, data: unknown, ttl = DEFAULT_TTL.medium) => 
    setInCache(`${KEY_PREFIX.category}${slug}`, data, ttl),
  delete: (slug: string) => deleteFromCache(`${KEY_PREFIX.category}${slug}`),
};

export const searchCache = {
  get: <T>(query: string) => getFromCache<T>(`${KEY_PREFIX.search}${query}`),
  set: (query: string, data: unknown, ttl = DEFAULT_TTL.short) => 
    setInCache(`${KEY_PREFIX.search}${query}`, data, ttl),
  delete: (query: string) => deleteFromCache(`${KEY_PREFIX.search}${query}`),
};

// Types for Cloudflare Workers environment
declare global {
  const TURBOMART_CACHE: KVNamespace;
} 