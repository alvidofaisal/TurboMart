import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis"; // see below for cloudflare and fastly adapters

// Check for Cloudflare KV credentials instead of Vercel KV
if (!process.env.CLOUDFLARE_KV_API_URL || !process.env.CLOUDFLARE_KV_API_TOKEN || !process.env.CLOUDFLARE_KV_NAMESPACE_ID) {
  throw new Error(
    "Please configure Cloudflare KV by setting `CLOUDFLARE_KV_API_URL`, `CLOUDFLARE_KV_API_TOKEN`, and `CLOUDFLARE_KV_NAMESPACE_ID`",
  );
}

const redis = new Redis({
  url: process.env.CLOUDFLARE_KV_API_URL,
  token: process.env.CLOUDFLARE_KV_API_TOKEN,
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

export const signUpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "15 m"),
  analytics: true,
  prefix: "ratelimit:signup",
});
