'use client';

import { useState, useEffect, ReactNode } from 'react';
import { FullPageLoading } from './loading-state';

/**
 * This component ensures we don't show flash of mock data on initial page load.
 * It delays rendering the actual content until client-side hydration has completed,
 * showing a loading indicator first.
 */
export function InitialDataGuard({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // On client side, show loading state briefly to ensure
    // we only show real data from the server
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 200); // Short delay to ensure hydration is complete
    
    return () => clearTimeout(timer);
  }, []);
  
  // During SSR and initial render, return nothing
  if (!isLoaded) {
    return <FullPageLoading message="Loading fresh data..." />;
  }
  
  // After client hydration, render the actual content
  return <>{children}</>;
} 