'use client';

import { Button } from "@/components/ui/button";

export function OfflineActions() {
  return (
    <div className="flex flex-col gap-4">
      <Button className="w-full" onClick={() => window.location.href = '/'}>
        Go to Homepage
      </Button>
      <Button
        className="w-full bg-white text-accent1 border border-accent1 hover:bg-gray-50"
        onClick={() => window.location.reload()}
      >
        Try Again
      </Button>
    </div>
  );
} 