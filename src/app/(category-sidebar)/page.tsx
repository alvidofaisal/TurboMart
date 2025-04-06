import { Link } from "@/components/ui/link";
import { getCollections, getProductCount } from "@/lib/queries";
import Image from "next/image";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { HeroBackground } from "@/components/ui/hero-background";

// Define types for our data
interface Category {
  name: string;
  slug: string;
  image_url: string | null;
}

interface Collection {
  name: string;
  categories: Category[];
}

// Add this helper function before the HeroBanner component
function formatNumber(num: number): string {
  // Simple regex to add commas as thousands separators
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Hero banner component for the home page
function HeroBanner() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-lg bg-primary-800 shadow-lg">
      {/* Background overlay - lowest z-index */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-primary-900/30 to-transparent"></div>
      
      {/* Dynamic background - either image or CSS fallback */}
      <HeroBackground />
      
      {/* Content container with higher z-index */}
      <div className="container relative z-10 mx-auto flex flex-col items-center px-4 py-12 text-center md:flex-row md:text-left lg:py-16">
        <div className="mb-8 flex-1 md:mb-0">
          {/* Product stats as main highlight - remove the conditional check */}
          {/* Always display the hardcoded stats */}
          <div className="mb-5 transform animate-pulse rounded-xl bg-white/20 px-6 py-5 backdrop-blur-sm md:max-w-md">
            <div className="flex flex-col items-center gap-1 md:items-start">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-white" />
                {/* Replace dynamic count with specific hardcoded number */}
                <span className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  1,019,681
                </span>
              </div>
              <h2 className="text-xl font-bold text-white md:text-2xl">Products At Your Fingertips</h2>
              <p className="text-sm text-white/90">Delivered in milliseconds, not minutes</p>
            </div>
          </div>
          
          <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">The Fastest Shop Alive</h1>
          <p className="mb-6 text-lg text-white/90 md:pr-8">
            Lightning-fast page loads. Instant search. Seamless checkout. Experience e-commerce at the speed of thought.
          </p>
        </div>
        <div className="flex-1">
          {/* This space intentionally left empty to maintain the layout */}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  // Fetch real-time data from the database directly here
  const [collections, productCount] = await Promise.all([
    getCollections(),
    getProductCount(),
  ]);
  
  // Handle empty data case
  if (!collections.length) {
    return (
      <div className="w-full p-4">
        <p className="text-lg text-gray-700">Loading product categories...</p>
      </div>
    );
  }
  
  let imageCount = 0;
  
  return (
    <div className="container mx-auto px-4">
      {/* Hero Banner with product stats */}
      <HeroBanner />
      
      {/* Categories */}
      {collections.map((collection: Collection) => (
        <div key={collection.name} className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">{collection.name}</h2>
            <Link href={`/${collection.name.toLowerCase()}`} className="flex items-center text-sm text-primary-700 hover:text-primary-800">
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {collection.categories.map((category: Category) => (
              <Link
                prefetch={true}
                key={category.name}
                className="group transition-transform hover:scale-105"
                href={`/products/${category.slug}`}
              >
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="relative flex h-32 items-center justify-center bg-gray-50 p-4">
                    <Image
                      loading={imageCount++ < 15 ? "eager" : "lazy"}
                      decoding="sync"
                      src={category.image_url ?? "/placeholder.svg"}
                      alt={`${category.name} category`}
                      className="h-20 w-20 rounded object-contain transition-all group-hover:scale-110"
                      width={80}
                      height={80}
                      quality={65}
                    />
                  </div>
                  <div className="p-3 text-center">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-primary-700">{category.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
      
      {/* Promo Section */}
      <div className="mb-10 rounded-lg bg-primary-50 p-6">
        <div className="flex flex-col items-center text-center md:flex-row md:justify-between md:text-left">
          <div className="mb-4 md:mb-0 md:pr-8">
            <h2 className="mb-2 text-xl font-bold text-primary-800">Free Shipping on Orders Over $50</h2>
            <p className="text-gray-700">Order now and get your items delivered fast and free!</p>
          </div>
          <Link 
            href="/deals" 
            className="rounded bg-primary-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-700"
          >
            Shop Deals
          </Link>
        </div>
      </div>
    </div>
  );
}
