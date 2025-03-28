import React from "react";
import { Link } from "@/components/ui/link";
import { getCollections } from "@/lib/queries";
import { Grid, ListFilter } from "lucide-react";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allCollections = await getCollections();
  return (
    <div className="container mx-auto flex flex-grow py-6">
      {/* Mobile filter toggle - visible only on mobile */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <button className="flex items-center gap-2 rounded border border-gray-300 bg-white p-2 text-sm font-medium shadow-sm">
          <ListFilter size={16} /> <span>Filter</span>
        </button>
        <div className="flex gap-2">
          <button className="rounded border border-gray-300 bg-white p-2">
            <Grid size={16} />
          </button>
          <select className="rounded border border-gray-300 bg-white p-2 text-sm">
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Popular</option>
          </select>
        </div>
      </div>
      
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden w-64 shrink-0 pr-8 md:block">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <h2 className="border-b border-gray-200 bg-primary-50 p-4 text-sm font-semibold text-primary-800">
            Browse Categories
          </h2>
          <div className="p-2">
            <ul className="flex flex-col space-y-1">
              {allCollections.map((collection) => (
                <li key={collection.slug} className="w-full">
                  <Link
                    prefetch={true}
                    href={`/${collection.slug}`}
                    className="block rounded-md p-2 text-sm text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  >
                    {collection.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Price filter section */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          <h2 className="border-b border-gray-200 bg-primary-50 p-4 text-sm font-semibold text-primary-800">
            Price Range
          </h2>
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <input 
                type="number" 
                placeholder="Min" 
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
              <span className="text-gray-500">-</span>
              <input 
                type="number" 
                placeholder="Max" 
                className="w-full rounded border border-gray-300 p-2 text-sm"
              />
            </div>
            <button className="mt-3 w-full rounded bg-primary-600 py-2 text-sm text-white hover:bg-primary-700">
              Apply
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content area */}
      <main className="min-h-[calc(100vh-200px)] w-full">
        {children}
      </main>
    </div>
  );
}
