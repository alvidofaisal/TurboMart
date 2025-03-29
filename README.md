# TurboMart

A high-performance, cost-free e-commerce platform built by refactoring the Next.js-based "NextFaster" template. It aims to deliver a seamless shopping experience with **minimal operational costs**, relying primarily on free-tier services (**Vercel, CockroachDB trial, Supabase, Cloudflare KV & R2**). *(Note: Costs may be incurred if free tier limits are exceeded or significant data transfer occurs between Vercel and Cloudflare.)*

## Key Features

- **Low Cost Architecture**: Built to operate primarily on free-tier services with monthly CockroachDB account cycling
- **High Performance**: Targeting TTFB under 100ms for cached content and page loads below 1.5 seconds
- **CockroachDB Compatible**: Uses native PostgreSQL clients (postgres-js) for better compatibility with CockroachDB
- **Vercel Deployment**: Hosted on Vercel for streamlined Next.js deployment and global edge network.
- **Cloudflare Integration**: Uses **Cloudflare R2** for storage and **Cloudflare KV** for caching/rate-limiting (accessed remotely via API from Vercel).
- **Modern Tech Stack**: Next.js 15, React 19, TypeScript, and Tailwind CSS

## Architecture Highlights

- Hosted on [Vercel](https://vercel.com)
- Uses [Next.js 15](https://nextjs.org/) with [Partial Prerendering](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model)
- Server Actions for all data mutations running on Vercel Functions
- Direct SQL queries via postgres-js client rather than Drizzle ORM for CockroachDB compatibility
- Images stored using [Cloudflare R2](https://developers.cloudflare.com/r2/) (accessed remotely)
- Rate limiting via [Cloudflare KV](https://developers.cloudflare.com/kv/) (accessed remotely) with @upstash/ratelimit

## Local Development

- Clone the repository and navigate to the project directory
- Run `pnpm install` to install dependencies
- Copy `.env.local.example` to `.env.local` and fill in your database (CockroachDB), Supabase, Cloudflare KV, and Cloudflare R2 credentials.
- Run `pnpm dev` to start the development server

For CockroachDB:
- Create a CockroachDB Serverless cluster and set the connection URL in your .env.local file
- Run `pnpm db:migrate` to apply the schema to your CockroachDB instance

## CockroachDB Compatibility Notes

This project is optimized for CockroachDB instead of a traditional PostgreSQL database:

1. Uses postgres-js client for direct compatibility with CockroachDB connection strings
2. Custom migration script (`pnpm db:migrate`) instead of Drizzle's standard `db:push` to work around limitations in PostgreSQL compatibility
3. Data import scripts that respect foreign key constraints and relationship dependencies
4. Support for generating a smaller demo dataset (5,000 products) for development and testing

*Note: The README previously mentioned using `@vercel/postgres`. This has been corrected in the code to use `postgres-js` for direct CockroachDB compatibility.*

## Performance Optimizations

- Aggressive caching with **Cloudflare KV (accessed remotely from Vercel Functions)**
- Vercel Edge Network caching for static assets
- Partial Prerendering (PPR) for hybrid static/dynamic content
- Client-side optimizations including service workers for offline support
- Optimized database queries with proper connection pooling and error handling

## Data Management

The data directory includes several scripts for importing products:
- `scripts/demo-import.js`: Creates a smaller set of 5,000 demo products for development
- `scripts/ordered-import.js`: Imports data in the correct order to maintain relationships
- `scripts/resume-import.js`: Handles imports in batches with automatic retry on failure

## Origin

TurboMart is a refactored version of the [NextFaster](https://github.com/ethanniser/NextFaster) e-commerce template, optimized for **minimal operational costs using Vercel and free tiers of other services**.

### Design notes

**Check out the detailed [twitter thread](https://x.com/ethanniser/status/1848442738204643330)** *(Note: This thread likely describes the original NextFaster architecture, not the current TurboMart setup)*

- Deployed on **Vercel**
- Uses [Next.js 15](https://nextjs.org/)
  - All mutations are done via [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Partial Prerendering](https://vercel.com/blog/partial-prerendering-with-next-js-creating-a-new-default-rendering-model) is used to precompute the shells of pages
  - When deployed, these are served statically from the edge
  - Dynamic data (such as cart information) is then streamed in
- Uses direct SQL queries via **`postgres-js`** client rather than Drizzle ORM for CockroachDB compatibility *(Corrected from previous mention of `@vercel/postgres`)*
- Images stored using **Cloudflare R2** (accessed remotely)
- Used [v0](https://v0.dev) to generate all initial UIs, check out some of the threads we were particularly impressed by:
  - [v0 makes pretty impressive search dropdown without a library](https://v0.dev/chat/lFfc68X3fir?b=b_1o4tkiC9EEm&p=0)
  - [recreating 'order' page](https://v0.dev/chat/RTBa8dXhx03?b=b_4RguNNUEhLh)
  - [recreating 'login' page](https://v0.dev/chat/tijwMFByNX9?b=b_XnRtduKn2oe)

#### AI

- Used [OpenAI](https://openai.com)'s `gpt-4o-mini` with their batch API and the Vercel AI SDK to generate product categories, names and descriptions
- [GetImg.ai](https://getimg.ai) was used to generate product images via the `stable-diffusion-v1-5` model

### Deployment

- **Deploy to Vercel**: Connect your Git repository (GitHub, GitLab, Bitbucket) to Vercel for automatic deployments.
- Configure **Environment Variables** in Vercel for:
  - CockroachDB connection string
  - Supabase URL and keys
  - Cloudflare Account ID
  - Cloudflare API Token (with necessary KV/R2 permissions)
  - Cloudflare KV Namespace ID
  - Cloudflare R2 Bucket Name, Access Key ID, and Secret Access Key
- Create a new CockroachDB Serverless cluster and set the connection URL environment variable.
- Run `pnpm db:migrate` locally or via a build step script if necessary to apply the schema to your CockroachDB instance.
- Set up Cloudflare R2 bucket and KV namespace and configure their details in Vercel environment variables.

### Local dev

- Clone the repository and navigate to the project directory
- Run `pnpm install` to install dependencies
- Copy `.env.local.example` to `.env.local` and fill in your **CockroachDB, Supabase, Cloudflare KV, and Cloudflare R2 credentials**.
- Run `pnpm dev` to start the development server
- The data directory includes several scripts for importing products:
  - `scripts/demo-import.js`: Creates a smaller set of 5,000 demo products for development
  - `scripts/ordered-import.js`: Imports data in the correct order to maintain relationships
  - `scripts/resume-import.js`: Handles imports in batches with automatic retry on failure
- For DB migrations:
  - Run `pnpm db:migrate` to apply schema to your CockroachDB instance

### CockroachDB Compatibility Notes

This project uses CockroachDB instead of a traditional PostgreSQL database. To ensure compatibility, we've made the following changes:

1. Direct SQL queries via **`postgres-js`** client instead of Drizzle ORM to avoid version conflicts *(Corrected from previous mention of `@vercel/postgres`)*
2. Custom migration script (`pnpm db:migrate`) instead of Drizzle's standard `db:push` to work around limitations in PostgreSQL compatibility
3. Data import scripts that respect foreign key constraints and relationship dependencies
4. Support for generating a smaller demo dataset (5,000 products) for development and testing

### Performance

*(Note: The linked PageSpeed report refers to the original NextFaster deployment, not the current TurboMart setup. Performance may differ based on the Vercel/Cloudflare integration.)*

[PageSpeed Report](https://pagespeed.web.dev/analysis/https-next-faster-vercel-app/7iywdkce2k?form_factor=desktop)

<img width="822" alt="SCR-20241027-dmsb" src="https://github.com/user-attachments/assets/810bc4c7-2e01-422d-9c3d-45daf5fb13ce">

### Costs

*(Note: The following cost breakdown is for the **original NextFaster template hosted solely on Vercel** and does **not** reflect the current TurboMart architecture using CockroachDB, Supabase, Cloudflare R2/KV alongside Vercel. The goal of TurboMart is to minimize these costs by leveraging free tiers, but actual costs depend on usage exceeding free limits on Vercel and potentially Cloudflare.)*

This project is hosted on Vercel, and uses many of the features of the Vercel platform.

Here is the full breakdown of the cost of running this project from Oct 20th 2024 through Nov 11th 2024.

During that time, the project recieved **over 1 million page views** across 45k unique users. The site has **over 1 million unique pages and images\***.

\*_images are unique by url (and caching) although not unqiue in their content_

#### Summary:

- ~1 million page views
- ~1 million unqiue product pages
- 45k unique users
- $513.12

Is $500 a lot for hosting this site? It depends, in this instance if it was a real ecommerce site that hosting cost would've been made back in the first 10k visitors.

It is likely possible to optimize these costs further if that is your goal, however that wasn't a priority for this project. We wanted to try and build the fastest possible site, quickly. We definitely achieved that goal without ever having to think about infra once.

These numbers are also on top of the Vercel pro plan, which is $20/contributor/month.

We would like to thank Vercel for covering the costs of hosting this project.

#### Compute and Caching

These costs represent the core functionality of serving the site.

| Resource             | Included                    | On-demand     | Charge  | Notes                                                                                 |
| -------------------- | --------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------- |
| Function Invocations | 1M / 1M                     | +31M          | $18.00  |
| Function Duration    | 1,000 GB-Hrs / 1,000 GB-Hrs | +333.7 GB-Hrs | $33.48  | Using In-function Concurrency reduces our compute usage by over 50% (see image below) |
| Edge Requests        | 10M / 10M                   | +93M          | $220.92 |                                                                                       |
| Fast Origin Transfer | 100 GB / 100 GB             | +461.33 GB    | $26.33  |                                                                                       |
| ISR Writes           | 2M / 2M                     | +12M          | $46.48  |                                                                                       |
| ISR Reads            | 10M / 10M                   | +20M          | $7.91   |                                                                                       |

Total: $353.12

#### Images

These costs represent the image optimization done by Vercel.

| Resource           | Included    | On-demand | Charge  | Notes                                                                                                                                                                                                                                                                              |
| ------------------ | ----------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image Optimization | 5000 / 5000 | +101,784  | $160.00 | This represents the number of distinct source images used on the site and optimized by Vercel. Each of the 1 million products has a unique image. The reason this number is less than 1 million is because the optimization is done on demand and not all pages have been visited. |

Total: $160.00

#### Even More Info

![image](https://github.com/user-attachments/assets/fc0ba91c-6e58-4ea0-8c1c-3acfaf56e98a)

![image](https://github.com/user-attachments/assets/fa208c6f-a943-42f2-ae90-3c50889cc98e)

![image](https://github.com/user-attachments/assets/e04b0948-e18c-4bd5-b0d4-7ef65f2af84a)
