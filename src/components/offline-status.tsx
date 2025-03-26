"use client";

import { useEffect, useState } from "react";
import { isOnline, setupOnlineListeners } from "@/lib/service-worker";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function OfflineStatus() {
  const [offline, setOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Initial status
    setOffline(!isOnline());
    
    // Listen for changes in online status
    const cleanup = setupOnlineListeners(
      () => {
        setOffline(false);
        setVisible(false);
      },
      () => {
        setOffline(true);
        setVisible(true);
      }
    );
    
    return cleanup;
  }, []);

  if (!visible || !offline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 transform rounded-lg bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-5 w-5 text-orange-600"
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
          <div>
            <p className="font-medium text-gray-900">You're offline</p>
            <p className="text-sm text-gray-500">
              Some features may be unavailable
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisible(false)}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 