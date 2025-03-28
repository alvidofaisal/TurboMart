import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-24">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" 
           aria-label="Loading..."></div>
    </div>
  );
}

export function LoadingCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="w-full">
      {/* Skeleton title */}
      <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
      
      {/* Skeleton cards grid */}
      <div className="flex flex-row flex-wrap justify-center gap-2 border-b-2 py-4 sm:justify-start">
        {Array(count).fill(0).map((_, i) => (
          <div key={i} className="flex w-[125px] flex-col items-center text-center animate-pulse">
            <div className="mb-2 h-14 w-14 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// A full-page loading indicator with a message
export function FullPageLoading({ message = "Loading real-time data..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
      <LoadingSpinner />
      <p className="mt-4 text-gray-700">{message}</p>
    </div>
  );
}

// Component to use while waiting for real data to arrive
export function InitialLoadingState() {
  return (
    <div className="w-full p-4 space-y-8">
      <LoadingCardsSkeleton count={8} />
      <LoadingCardsSkeleton count={6} />
    </div>
  );
} 