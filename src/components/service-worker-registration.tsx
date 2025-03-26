"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register service worker on client-side only
    registerServiceWorker();
  }, []);

  // This component doesn't render anything
  return null;
} 