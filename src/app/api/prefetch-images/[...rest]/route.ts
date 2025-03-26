import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-static";

function getHostname() {
  if (process.env.NODE_ENV === "development") {
    return "localhost:3000";
  }
  if (process.env.VERCEL_ENV === "production") {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  return process.env.VERCEL_BRANCH_URL;
}

// Simple regex-based HTML parser for extracting image attributes
function extractImages(html: string): { srcset?: string, sizes?: string, src?: string, alt?: string, loading?: string }[] {
  // Find all img tags within a main tag
  const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/gi;
  const mainMatch = mainRegex.exec(html);
  
  if (!mainMatch || !mainMatch[1]) {
    return [];
  }
  
  const mainContent = mainMatch[1];
  const imgRegex = /<img[^>]*>/gi;
  const imgs = mainContent.match(imgRegex) || [];
  
  return imgs.map(img => {
    // Extract attributes using regex
    const srcsetMatch = /srcset=["']([^"']*)["']/i.exec(img);
    const sizesMatch = /sizes=["']([^"']*)["']/i.exec(img);
    const srcMatch = /src=["']([^"']*)["']/i.exec(img);
    const altMatch = /alt=["']([^"']*)["']/i.exec(img);
    const loadingMatch = /loading=["']([^"']*)["']/i.exec(img);
    
    return {
      srcset: srcsetMatch ? srcsetMatch[1] : undefined,
      sizes: sizesMatch ? sizesMatch[1] : undefined,
      src: srcMatch ? srcMatch[1] : undefined,
      alt: altMatch ? altMatch[1] : undefined,
      loading: loadingMatch ? loadingMatch[1] : undefined
    };
  }).filter(img => img.src); // Only return images with src attribute
}

export async function GET(
  _: NextRequest,
  { params }: { params: { rest: string[] } },
) {
  const schema = process.env.NODE_ENV === "development" ? "http" : "https";
  const host = getHostname();
  if (!host) {
    return new Response("Failed to get hostname from env", { status: 500 });
  }
  const href = (await params).rest.join("/");
  if (!href) {
    return new Response("Missing url parameter", { status: 400 });
  }
  const url = `${schema}://${host}/${href}`;
  const response = await fetch(url);
  if (!response.ok) {
    return new Response("Failed to fetch", { status: response.status });
  }
  const body = await response.text();
  
  // Use regex-based parser instead of linkedom
  const images = extractImages(body);
  
  return NextResponse.json(
    { images },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
