import { Link } from "@/components/ui/link";
import { getCollections, getProductCount } from "@/lib/queries";
import { InitialLoadingState } from "@/components/ui/loading-state";
import { Suspense } from "react";

import Image from "next/image";

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

// Separate component for home content to enable Suspense
async function HomeContent() {
  // Fetch real-time data from the database
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
    <div className="w-full p-4">
      <div className="mb-2 w-full flex-grow border-b-[1px] border-accent1 text-sm font-semibold text-black">
        Explore {productCount?.count.toLocaleString()} products
      </div>
      {collections.map((collection: Collection) => (
        <div key={collection.name}>
          <h2 className="text-xl font-semibold">{collection.name}</h2>
          <div className="flex flex-row flex-wrap justify-center gap-2 border-b-2 py-4 sm:justify-start">
            {collection.categories.map((category: Category) => (
              <Link
                prefetch={true}
                key={category.name}
                className="flex w-[125px] flex-col items-center text-center"
                href={`/products/${category.slug}`}
              >
                <Image
                  loading={imageCount++ < 15 ? "eager" : "lazy"}
                  decoding="sync"
                  src={category.image_url ?? "/placeholder.svg"}
                  alt={`A small picture of ${category.name}`}
                  className="mb-2 h-14 w-14 border hover:bg-accent2"
                  width={48}
                  height={48}
                  quality={65}
                />
                <span className="text-xs">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<InitialLoadingState />}>
      <HomeContent />
    </Suspense>
  );
}
