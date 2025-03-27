import { getSearchResults } from "@/lib/queries";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // format is /api/search?q=term
  const searchTerm = request.nextUrl.searchParams.get("q");
  if (!searchTerm || !searchTerm.length) {
    return Response.json([]);
  }

  try {
    console.log(`API Search request for term: "${searchTerm}"`);
    const results = await getSearchResults(searchTerm);
    console.log(`API found ${results.length} results`);

    const searchResults: ProductSearchResult = results.map((item) => {
      const href = `/products/${item.categories.slug}/${item.subcategories.slug}/${item.products.slug}`;
      return {
        ...item.products,
        href,
      };
    });
    
    const response = Response.json(searchResults);
    // cache for 5 minutes instead of 10
    response.headers.set("Cache-Control", "public, max-age=300");
    return response;
  } catch (error) {
    console.error('Search API error:', error);
    return Response.json([]);
  }
}

export type ProductSearchResult = {
  href: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  price: string;
  subcategory_slug: string;
}[];
