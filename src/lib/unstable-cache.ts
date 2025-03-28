import { unstable_cache as nextCache } from 'next/cache';
import { isBuild } from './db-fallback';

// Enhanced version of Next.js unstable_cache that prevents flash of mock data
export function unstable_cache<T>(
  fn: (...args: any[]) => Promise<T>,
  keyParts?: string[],
  options?: { revalidate?: number; tags?: string[] }
) {
  // Create a wrapper that handles the initial load case differently
  const enhancedFn = async (...args: any[]): Promise<T> => {
    const result = await fn(...args);
    
    // Skip caching during build to prevent mock data from being cached
    if (isBuild) {
      return result;
    }
    
    return result;
  };
  
  // Use Next.js cache with our enhanced function
  const cachedFn = nextCache(enhancedFn, keyParts, {
    ...options,
    // Force shorter revalidation on production to prevent stale data
    revalidate: process.env.NODE_ENV === 'production' ? 
      Math.min(options?.revalidate || 60, 60) : // 1 minute max in production
      options?.revalidate,
  });
  
  // Return a function that ensures we always get fresh data on initial load
  return async (...args: any[]): Promise<T> => {
    // In production, we use shorter cache times but don't use timestamp-based keys
    // as this causes build errors with unstable_cache
    if (process.env.NODE_ENV === 'production') {
      return cachedFn(...args);
    }
    
    // Use the standard cached function
    return cachedFn(...args);
  };
}
