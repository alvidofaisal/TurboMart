# Product Requirements Document (PRD): TurboMart

## Introduction

TurboMart is a high-performance, cost-free e-commerce platform built by refactoring the Next.js-based "NextFaster" template. It aims to deliver a seamless shopping experience comparable to platforms like Shopee and Alibaba, relying primarily on free-tier services. Per the requirement, TurboMart will continue using one CockroachDB account per month, cycling to a new account monthly to leverage CockroachDB Serverless's $400 one-month trial credit (as of March 25, 2025), aiming to keep primary database costs at zero. TurboMart uses **Vercel for hosting** and Supabase for additional database functionality, while retaining CockroachDB as the primary database. It utilizes **Cloudflare R2** for image storage and **Cloudflare KV** for caching, accessed remotely from Vercel Functions.

## Goals and Objectives

- Achieve Time to First Byte (TTFB) under 100ms for cached content.
- Target full page load times below 1.5 seconds.
- Support up to 2 million page views per month within the $400 trial credit for CockroachDB and the **free tiers of Vercel, Cloudflare (for KV/R2 usage), and Supabase.** *(Note: Exceeding Vercel's free tier limits or incurring significant data transfer costs between Vercel and Cloudflare may result in operational costs).*
- Maintain zero operational cost for the primary database by cycling CockroachDB accounts monthly.
- Optimize performance with creative, cost-effective techniques.

## Target Audience

TurboMart serves users who value cost efficiency and speed:

- **Budget-Conscious Entrepreneurs**: Small business owners launching online stores for free.
- **Developers and Innovators**: Tech enthusiasts experimenting with optimization strategies.
- **Performance-Sensitive Shoppers**: Users demanding fast, responsive shopping experiences, especially in low-connectivity regions.

## User Personas

- **Entrepreneur Emma**: Needs a free, reliable e-commerce solution.
- **Developer Dan**: Wants to push performance boundaries with free tools.
- **Shopper Sam**: Expects quick load times on mobile devices.

## Features and Functionality

TurboMart enhances NextFaster with cost-free, performance-driven features:

- **Product Catalog**: Pre-rendered pages for fast browsing.
- **Shopping Cart**: Client-side storage with batched server syncs.
- **Search Functionality**: Instant client-side filtering using static indexes.
- **User Accounts**: Lightweight JWT authentication with minimal server load via Supabase Auth.
- **Order Processing**: Queue-based writes to reduce database usage.

## Improvements Over NextFaster

- Advanced caching with **Cloudflare KV (accessed remotely)**.
- Static Site Generation (SSG) for high-traffic pages.
- Client-side optimizations to minimize server work.
- Efficient database usage to stay within CockroachDB's $400 trial credit and Supabase's free tier limits.

## Technical Requirements

### Infrastructure and Hosting

- **Vercel**: Hosts the Next.js application, leveraging its global Edge Network for static assets and Serverless/Edge Functions for dynamic API routes and server-side rendering. (Free tier includes generous limits, but usage beyond the free tier incurs costs).

**Impact**: Leverages **Vercel's** managed infrastructure and global network for speed, reduces server-side compute needs via serverless functions, and simplifies deployment workflows. Requires monitoring Vercel usage limits.

### Database and Storage

**Previous**: CockroachDB Serverless Trial with one account per month ($400 credit, ~2 billion RUs, 40GB storage).

**New**:
- **CockroachDB Serverless**: Retains the single-account-per-month cycling strategy for primary transactional data (e.g., orders, products).
- **Supabase**: Adds PostgreSQL for user management and lightweight relational data (free tier: 500MB storage, 2GB bandwidth/month).
- **Cloudflare R2**: Stores images and static assets (free tier: 10GB storage, 1 million Class B requests/month, free egress). Accessed remotely via API calls from Vercel Functions.

**Impact**: CockroachDB handles high-scale transactional data, Supabase simplifies user authentication and secondary data, and R2 provides low-cost object storage accessible from Vercel.

### Caching Strategies

**Previous**: Cloudflare Free Tier for static assets (max-age=31536000), HTML (max-age=3600), APIs (max-age=60), and in-memory caching on VMs (100MB/VM).

**New**:
- **Vercel Edge Network Cache**: Automatically caches static assets deployed with the Next.js application. Configuration options available for server-rendered content.
- **Cloudflare KV**: Remotely accessed via API from Vercel Functions for caching dynamic API responses (e.g., database queries). Subject to KV read/write costs and potential Vercel data transfer costs. (Free tier: 100k reads/day, 1k writes/day).
- **Supabase**: Leverages built-in caching for user data queries.

**Impact**: Utilizes Vercel's built-in caching and leverages Cloudflare KV remotely for dynamic data caching, reducing database load while needing monitoring for potential cross-service costs.

### Image Optimization

**Previous**: Images stored on VM disks, served via NGINX, cached by Cloudflare, pre-processed to WebP with sharp.

**New**:
- Images stored in **Cloudflare R2**, served directly (potentially via Cloudflare CDN) or accessed via Vercel Functions. URLs need to be managed appropriately.
- Pre-processing to WebP remains using sharp (client-side or build-time).

**Impact**: R2 provides scalable storage with built-in caching, maintaining performance without VMs.

### Client-Side Optimizations

**Previous**: Service workers, async loading with useSWR, WebAssembly for tasks like price calculations.

**New**: Unchanged, but service workers now cache assets served by **Vercel** and potentially images from **R2 (via CDN or direct links)**.

**Impact**: Frontend optimizations remain intact, integrating with the Vercel hosting setup.

### Server-Side Optimizations

**Previous**: NGINX reverse proxy, HTTP/3, Node.js clustering on VMs.

**New**:
- **Vercel Serverless/Edge Functions** handle server-side logic (API routes, Server Actions, SSR) with automatic scaling and built-in optimizations.
- Supabase provides serverless API endpoints for user-related operations.

**Impact**: Simplifies architecture, eliminates VM overhead, and leverages **Vercel's serverless platform**.

### Monitoring and Analytics

**Previous**: Grafana + Telegraf for VM and database monitoring, Plausible Analytics for users.

**New**:
- **Vercel Analytics**: Monitors traffic, performance, and function usage within Vercel.
- **CockroachDB Monitoring**: Tracks database health and RUs.
- **Supabase Dashboard**: Monitors usage and performance.
- **Plausible Analytics**: Retained for lightweight user analytics.

**Impact**: Uses a mix of provider-native tools (**Vercel**, CockroachDB, Supabase), maintaining visibility. Cloudflare monitoring might be needed separately for KV/R2 usage.

### CockroachDB Single-Account Strategy

**Previous and New (Unchanged)**:
- **Trial Activation**: Register one CockroachDB account monthly using a unique email (e.g., user+month@gmail.com) and IP (via free VPNs like ProtonVPN).
- **Cluster Creation**: Launch a Basic cluster (single-region, e.g., AWS us-east-1) with a $400 spend limit.
- **Data Management**: Store all TurboMart transactional data (products, orders) in this cluster.

**Monthly Cycling**:
1. Backup data at the end of each 30-day trial using CockroachDB's free backup tools.
2. Create a new account with a fresh email and IP.
3. Restore the backup to the new cluster.
4. Update **Vercel environment variables** to point to the new cluster (requires redeployment or using Vercel's API).

**Optimization**: Minimize RUs with aggressive caching (via remote Cloudflare KV) and batched writes to stay under 2 billion RUs/month.

**Impact**: Ensures zero database costs, accessible from **Vercel Functions** via connection settings stored in environment variables.

## Rebellious Optimizations

1. Multi-Account Exploitation: Create multiple free-tier accounts across providers (e.g., AWS, Google Cloud) to scale resources beyond single-account limits.

2. P2P Networking: Use WebRTC to distribute storage and processing across users' devices, reducing server load.

3. Resource Recycling: Automate the deletion and recreation of free-tier resources to reset usage quotas.

4. Bandwidth Leeching: Hotlink large assets (e.g., images, videos) from third-party hosts to offload bandwidth costs (ethically and legally questionable).

5. Ad-Block Evasion: Implement techniques to circumvent ad-blockers, enabling potential monetization without traditional hosting costs.

## Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)
- Set up **Vercel project** and link to Git repository.
- Configure **Cloudflare R2** bucket and **Cloudflare KV** namespace.
- Register the first CockroachDB account and configure Supabase.
- Set up necessary environment variables in Vercel for all services (CockroachDB, Supabase, Cloudflare R2/KV).

### Phase 2: Database Configuration (Weeks 2-3)
- Design CockroachDB schema with indexes (e.g., `CREATE INDEX ON products (slug)`).
- Configure Supabase for user authentication and secondary data.
- Create custom migration script for CockroachDB compatibility with Drizzle ORM.

### Phase 3: Application Refactoring (Weeks 4-5)
- Use SSG for top 10K product pages, ISR for others.
- Refactor API routes and Server Actions to run efficiently as **Vercel Serverless/Edge Functions**, minimizing database calls and optimizing remote calls to KV/R2.

### Phase 4: Client-Side Enhancements (Week 6)
- Implement service workers, WebAssembly, and async loading.

### Phase 5: Image Pipeline (Week 7)
- Automate WebP conversion and upload to R2.

### Phase 6: Monitoring and Tuning (Week 8)
- Deploy **Vercel**, CockroachDB, and Supabase monitoring; potentially add Cloudflare monitoring for KV/R2. Target <2B RUs/month and stay within Vercel/Cloudflare free tiers.

## Timeline

- Total Duration: 8 weeks
- Key Milestones: Setup (Week 1), app deployment (Week 5), optimization (Week 8)

## Testing and Quality Assurance

- **Load Testing**: Simulate 2M page views with Artillery or k6, targeting <150ms TTFB, <1.5s load.
- **Performance Benchmarking**: Compare to Shopee (1-2s load) using WebPageTest.
- **Cycle Testing**: Validate smooth CockroachDB account transitions and data restoration.

## Risks and Mitigations

- **Free-Tier Limits**: Monitor **Vercel usage** (Function invocations/duration, bandwidth), Cloudflare KV/R2 usage, Supabase limits, and CockroachDB RUs (<2B/month) to avoid overages and potential costs.
- **ToS Violations**: Use VPNs and unique emails for CockroachDB cycling; review Vercel, Cloudflare, and Supabase ToS.
- **Performance Variability**: Optimize **Vercel Functions'** code, caching (local Vercel caches and remote KV), and database interaction for efficiency. Network latency between Vercel and Cloudflare could impact performance for KV/R2 access.

## Implementation Progress

### Completed Tasks

#### Phase 1: Infrastructure Setup
- ✅ Created **Vercel project configuration** (e.g., `vercel.json`, if needed)
- ✅ Set up project structure for **Vercel deployment**
- ✅ Added CockroachDB integration
- ✅ Integrated Supabase for authentication
- ✅ Configured R2 for image storage

#### Phase 2: Database Configuration
- ✅ Updated database schema to work with CockroachDB
- ✅ Created database connection configuration
- ✅ Implemented Supabase authentication system
- ✅ Added backup and restore scripts for CockroachDB account cycling
- ✅ Created custom migration script to bypass Drizzle-PostgreSQL compatibility issues with CockroachDB
- ✅ Resolved database query conflicts by migrating from Drizzle ORM to Vercel Postgres client
- ✅ Implemented demo import script for creating manageable 5,000 product dataset for development
- ✅ Fixed TypeScript errors with database schema and query interfaces
- ✅ Implemented database connection pooling for improved performance
- ✅ Replaced Vercel Postgres with postgres-js for direct CockroachDB compatibility
- ✅ Implemented robust error handling for database connection failures

#### Phase 3: Application Refactoring
- ✅ Updated Next.js configuration for static site generation
- ✅ Modified image handling to use R2 instead of Vercel Blob
- ✅ Created R2 API endpoints for image uploads and deletion
- ✅ Optimized database query patterns to reduce Request Units (RUs)
- ✅ Fixed TypeScript errors in database access code to ensure type safety
- ✅ Refactored queries.ts to use direct SQL queries instead of ORM for better CockroachDB compatibility
- ✅ Implemented proper error handling for database query failures
- ✅ Replaced Vercel KV with Cloudflare KV for rate limiting functionality
- ✅ Updated application branding from NextFaster to TurboMart
- ✅ Fixed issues with application structure and Next.js App Router
- ✅ Resolved React hydration mismatches for improved client rendering
- ✅ Optimized root layout structure for better component hierarchy
- ✅ Fixed not-found page to use client components to prevent database access during build
- ✅ Replaced LinkedDOM with regex-based HTML parsing to avoid canvas module dependency
- ✅ Implemented build-time detection in auth components to prevent database access during static generation
- ✅ Created specialized not-found handling that works correctly in production builds 
- ✅ Enhanced UI with optimized header styling and gradient effects matching brand colors
- ✅ Improved hero banner with fallback mechanisms for image loading
- ✅ Implemented client/server component separation for robust image handling
- ✅ Streamlined navigation by removing redundant menu items

#### Phase 4: Client-Side Enhancements
- ✅ Implemented service workers for offline support
- ✅ Created offline page for disconnected users
- ✅ Added offline status notifications
- ✅ Implemented PWA manifest for installable experience
- ✅ Enhanced client-side data fetching with proper TypeScript typing

#### Phase 5: Caching & Performance
- ✅ Implemented Cloudflare KV caching system for database queries
- ✅ Updated database queries to use KV cache with appropriate TTLs
- ✅ Created monitoring module for tracking performance metrics
- ✅ Implemented comprehensive load testing infrastructure
- ✅ Created data import scripts with batch processing and error handling capabilities
- ✅ Developed resume-import.js for handling large dataset imports with automatic retry on failure
- ✅ Implemented batch processing to prevent database timeouts during data import
- ✅ Fixed database connection handling during build time to prevent build failures
- ✅ Implemented graceful error handling for database connections
- ✅ Created mock data for static build process to enable successful builds without database
- ✅ Optimized search functionality for CockroachDB compatibility with simplified query patterns
- ✅ Improved search API error handling and reduced cache TTL for better responsiveness
- ✅ Added checkpointing system to product import process for reliable resume capability
- ✅ Enhanced search functionality to correctly handle newly imported products with reduced cache TTL (5 minutes)
- ✅ Optimized full-text search query pattern in CockroachDB for better performance and result relevance
- ✅ Implemented robust error handling for search functionality with fallback mechanisms
- ✅ Fixed subcategory product display issue where "No products" message was shown even when products were available
- ✅ Implemented loading states to prevent flash of mock data during initial page load
- ✅ Created client-side data guard system to ensure first-time visitors see proper loading indicators
- ✅ Used React Suspense boundaries for better loading state management
- ✅ Enhanced unstable_cache implementation to prevent mock data caching in production
- ✅ Implemented reliable database connection helper with automatic retry logic
- ✅ Fixed initial page load issues to ensure real data is always displayed in production

#### Phase 6: Image Pipeline
- ✅ Created WebP conversion pipeline for product images
- ✅ Implemented responsive image size generation
- ✅ Added support for automatic R2 upload of processed images
- ✅ Optimized image delivery through Cloudflare CDN

### In Progress
- 🔄 Fine-tuning database query patterns to minimize RUs
- 🔄 Optimizing **Vercel Functions** for performance
- 🔄 Testing full CockroachDB account cycling process
- 🔄 Implementing data model relationship maintenance during database migrations
- 🔄 Enhancing error handling for database connection timeouts
- 🔄 Refining React hydration strategy for **Vercel's deployment environment**
- 🔄 Optimizing component structure to eliminate layout shifts

### Remaining Tasks
- ⏳ Integrate monitoring with **Vercel Analytics** dashboard (and potentially Cloudflare for KV/R2)
- ⏳ Conduct final end-to-end performance validation with real-world traffic patterns
- ⏳ Document operational procedures for monthly account cycling
- ⏳ Create automated scripts for database cycling process
- ⏳ Implement comprehensive database health checks

## Conclusion

TurboMart replaces Oracle VMs with **Vercel hosting**, integrates Supabase for user management, and retains CockroachDB with its single-account cycling strategy. It utilizes **Cloudflare R2 and KV remotely** for storage and caching. This aims to deliver a fast, scalable e-commerce platform rivaling industry leaders, leveraging **Vercel's serverless platform and CDN**, while carefully managing potential cross-service costs to maintain low operational expenses.

## Technical Notes

### CockroachDB and Drizzle Compatibility

While CockroachDB is PostgreSQL-compatible, it doesn't fully support all PostgreSQL syntax features. In particular:

1. **DO Blocks**: CockroachDB doesn't support PostgreSQL's `DO $$ BEGIN ... END $$;` syntax used by Drizzle ORM for conditionally creating foreign key constraints.
2. **Custom Migration**: TurboMart uses a custom migration script (`db:migrate`) instead of Drizzle's standard `db:push` to work around these limitations.
3. **Performance Considerations**: CockroachDB recommends using UUIDs over sequential IDs for better distributed performance.

These adaptations allow TurboMart to leverage CockroachDB's free trial while maintaining compatibility with the codebase.

### React Hydration Considerations

When deploying through **Vercel**, the following considerations may apply:

1. **HTML Differences**: Differences between server-rendered HTML and client-rendered HTML can cause React hydration mismatches.
2. **Hydration Suppression**: The application uses `suppressHydrationWarning` on the body element to prevent non-critical mismatches from breaking the UI.
3. **Project Structure**: The App Router structure must be carefully maintained to avoid conflicting layouts and missing HTML/body tags, ensuring compatibility with Vercel's build and rendering process.

These optimizations ensure the application can run smoothly on **Vercel** while maintaining React's client-side performance benefits.

### Build Process Optimization

TurboMart implements several optimizations to ensure smooth build processes:

1. **Environment Detection**: The application detects build-time vs. runtime environments to avoid database access during static generation.
2. **Database Fallbacks**: Mock data is provided for all database queries during build time.
3. **Client/Server Component Separation**: Clear separation between client and server components ensures proper hydration.
4. **Not-Found Handling**: Custom not-found pages use client-side components to avoid server-side dependencies.
5. **Error Handling**: Robust error handling for database connections prevents build failures.

These optimizations ensure successful builds even without database connections, allowing for deployment to **Vercel**.

### Next.js 15 PPR Considerations

TurboMart addresses specific challenges with Next.js 15's Partial Prerendering (PPR) feature:

1. **Cookie Access in PPR**: Next.js 15's PPR has limitations when accessing cookies during server-side rendering, particularly for authentication. TurboMart implements:
   - Safe cookie access patterns with proper fallbacks
   - Client-side data guards to prevent flash of mock data
   - Custom-built InitialDataGuardProvider to ensure consistent user experience

2. **Build vs. Runtime Detection**: The application carefully distinguishes between:
   - Build-time environment (using mock data)
   - Development runtime (using local database)
   - Production runtime (using real database credentials)

3. **Database Handling**: Robust database connection management with:
   - Automatic connection retries
   - Graceful error handling
   - Clear separation between mock and real data sources

These optimizations ensure that users always see real data from the database in production, with appropriate loading states during data fetching.

### UI/UX Optimizations

TurboMart implements several advanced UI/UX optimizations to enhance the user experience:

1. **Brand-Aligned Styling**: 
   - Rich gradient backgrounds that reflect the "speed" theme
   - Dynamic color transitions in the header that match the product imagery
   - Consistent color palette throughout the application for brand cohesion

2. **Resilient Image Handling**:
   - Client-side fallback system for hero images using a dedicated component
   - CSS-based fallbacks that maintain design integrity when images fail to load
   - Proper separation between client and server components for robust image rendering

3. **Streamlined Navigation**:
   - Simplified header with optimized mobile layouts
   - Removal of redundant navigation elements for cleaner user experience
   - Enhanced visual hierarchy to guide users through the interface

4. **Performance-Focused Design Decisions**:
   - Lightweight CSS animations that don't impact performance
   - Strategic use of opacity and color overlays to maintain text readability
   - Consistent loading states to prevent jarring layout shifts

These UI/UX enhancements work alongside the technical optimizations to create a cohesive, high-performance shopping experience that maintains visual appeal even under challenging network conditions.

## Next Steps

1. Complete fine-tuning of database performance
2. Integrate monitoring systems with alerting
3. Conduct comprehensive load testing at production scale
4. Document operational procedures for maintenance

