'use client';

import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { FullPageLoading } from './loading-state';

// Create a context to track first-time visits
const InitialDataContext = createContext({
  isFirstVisit: true,
  setVisited: () => {}
});

// Hook to use the context
export const useInitialDataContext = () => useContext(InitialDataContext);

/**
 * Provider component that manages first-time visit state and shows a loading screen
 * for first-time visitors to prevent flashing mock data
 */
export function InitialDataGuardProvider({ children }: { children: ReactNode }) {
  // Check if this is a first-time visit
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mark as visited
  const setVisited = () => {
    if (isFirstVisit) {
      localStorage.setItem('visited-turbomart', 'true');
      setIsFirstVisit(false);
    }
  };
  
  useEffect(() => {
    // Check if the user has visited before
    const hasVisited = localStorage.getItem('visited-turbomart') === 'true';
    
    if (hasVisited) {
      // Returning visitor, update state immediately
      setIsFirstVisit(false);
      setIsLoading(false);
    } else {
      // First-time visitor, show loading screen briefly
      const timer = setTimeout(() => {
        setIsLoading(false);
        setVisited();
      }, 1500); // Longer delay for first visit to ensure real data loads
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <InitialDataContext.Provider value={{ isFirstVisit, setVisited }}>
      {isLoading && isFirstVisit ? (
        <FullPageLoading message="Loading fresh data..." />
      ) : (
        children
      )}
    </InitialDataContext.Provider>
  );
} 