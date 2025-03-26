// This is a special server component for not-found pages
// It handles metadata and prevents database access during build

import { Metadata } from "next";
import GlobalNotFound from "./global-not-found";

// Static metadata for not-found pages
export const metadata: Metadata = {
  title: "404 - Not Found | TurboMart",
  description: "The page you are looking for does not exist"
};

// Detect if we're in a build environment
const isBuild = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';

export default function NotFoundServer() {
  // No database access here, just return the client component
  return <GlobalNotFound />;
} 