'use client';

import dynamic from 'next/dynamic';

// Dynamically import the offline status component
const OfflineStatus = dynamic(() => import('./offline-status'), {
  ssr: false,
});

// Client-side service worker registration component
const ServiceWorkerRegistration = dynamic(
  () => import('./service-worker-registration'),
  { ssr: false }
);

// This component groups all client-only functionality
export function ClientSideComponents() {
  return (
    <>
      {/* Service worker registration */}
      <ServiceWorkerRegistration />
      
      {/* Offline status notification */}
      <OfflineStatus />
    </>
  );
} 