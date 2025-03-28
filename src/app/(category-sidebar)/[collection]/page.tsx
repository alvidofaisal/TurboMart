import { Link } from "@/components/ui/link";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { getCollectionDetails } from "@/lib/queries";
import { InitialLoadingState } from "@/components/ui/loading-state";
import { Suspense } from "react";

import Image from "next/image";

export async function generateStaticParams() {
  return await db.select({ collection: collections.slug }).from(collections);
}

// Separate component for collection content to enable Suspense
async function CollectionContent({ collectionName }: { collectionName: string }) {
  // Fetch real-time data from the database
  const collections = await getCollectionDetails(collectionName);
  
  if (collections.length === 0) {
    return (
      <div className="w-full p-4">
        <p className="text-lg text-gray-700">No data found for this collection.</p>
      </div>
    );
  }
  
  let imageCount = 0;

  return (
    <div className="w-full p-4">
      {collections.map((collection) => (
        <div key={collection.name}>
          <h2 className="text-xl font-semibold">{collection.name}</h2>
          <div className="flex flex-row flex-wrap justify-center gap-2 border-b-2 py-4 sm:justify-start">
            {collection.categories.map((category) => (
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

export default async function CollectionPage(props: {
  params: Promise<{
    collection: string;
  }>;
}) {
  const collectionName = decodeURIComponent((await props.params).collection);

  return (
    <Suspense fallback={<InitialLoadingState />}>
      <CollectionContent collectionName={collectionName} />
    </Suspense>
  );
}
