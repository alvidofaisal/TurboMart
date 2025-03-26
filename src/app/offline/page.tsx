'use client';

import { Button } from "@/components/ui/button";
// Use a regular anchor tag instead of Next.js Link component
// to avoid type declaration issues in this environment

import { metadata } from "./metadata";
import { OfflineActions } from "./offline-actions";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-10">
      <div className="container flex max-w-md flex-col items-center text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100">
          <svg
            className="h-12 w-12 text-orange-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="mb-4 text-3xl font-bold">You're offline</h1>
        <p className="mb-8 text-gray-600">
          It looks like you've lost your internet connection. Some features may
          be unavailable until you're back online.
        </p>
        <p className="mb-4 text-sm text-gray-500">
          Don't worry—TurboMart saved some content for offline browsing. You can
          still access previously viewed pages and images.
        </p>
        <OfflineActions />
      </div>
      
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>TurboMart works offline using service workers.</p>
        <p>Your browser has cached some pages for offline use.</p>
      </div>
    </div>
  );
} 