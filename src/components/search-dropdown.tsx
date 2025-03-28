"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { Product } from "../db/schema";
import { Link } from "@/components/ui/link";
import { useParams, useRouter } from "next/navigation";
import { ProductSearchResult } from "@/app/api/search/route";

type SearchResult = Product & { href: string };

export function SearchDropdownComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // we don't need react query, we have react query at home
  // react query at home:
  useEffect(() => {
    if (searchTerm.length === 0) {
      setFilteredItems([]);
    } else {
      setIsLoading(true);

      const searchedFor = searchTerm;
      fetch(`/api/search?q=${searchTerm}`).then(async (results) => {
        const currentSearchTerm = inputRef.current?.value;
        if (currentSearchTerm !== searchedFor) {
          return;
        }
        const json = await results.json();
        setIsLoading(false);
        setFilteredItems(json as ProductSearchResult);
      });
    }
  }, [searchTerm, inputRef]);

  const params = useParams();
  useEffect(() => {
    if (!params.product) {
      const subcategory = params.subcategory;
      setSearchTerm(
        typeof subcategory === "string" ? subcategory.replaceAll("-", " ") : "",
      );
    }
  }, [params]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prevIndex) =>
        prevIndex < filteredItems.length - 1 ? prevIndex + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : filteredItems.length - 1,
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      router.push(filteredItems[highlightedIndex].href);
      setSearchTerm(filteredItems[highlightedIndex].name);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // close dropdown when clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="font-sans" ref={dropdownRef}>
      <div className="relative w-full">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 text-gray-400">
            <Search size={18} />
          </div>
          <Input
            ref={inputRef}
            autoCapitalize="off"
            autoCorrect="off"
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(e.target.value.length > 0);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            className="h-10 rounded-full border-none bg-white pl-10 pr-10 font-medium ring-primary-200 placeholder:text-gray-400 focus:ring-2"
          />
          {searchTerm && (
            <button
              type="button"
              className="absolute right-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              onClick={() => {
                setSearchTerm("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <ScrollArea className="max-h-[400px]">
              {isLoading ? (
                <div className="flex h-16 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-700"></div>
                </div>
              ) : filteredItems.length > 0 ? (
                <div className="py-2">
                  {filteredItems.map((item, index) => (
                    <Link href={item.href} key={item.slug} prefetch={true}>
                      <div
                        className={cn("flex cursor-pointer items-center px-4 py-2 transition-colors", {
                          "bg-primary-50": index === highlightedIndex,
                        })}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          setSearchTerm(item.name);
                          setIsOpen(false);
                          inputRef.current?.blur();
                        }}
                      >
                        <div className="mr-3 overflow-hidden rounded-md bg-gray-50">
                          <Image
                            loading="eager"
                            decoding="sync"
                            src={item.image_url ?? "/placeholder.svg"}
                            alt={`${item.name} thumbnail`}
                            className="h-10 w-10 object-contain"
                            height={40}
                            width={40}
                            quality={65}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="line-clamp-1 text-xs text-gray-500">
                            {item.description?.substring(0, 60)}...
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="flex h-24 flex-col items-center justify-center p-4 text-center">
                  <p className="text-sm font-medium text-gray-500">No results found for "{searchTerm}"</p>
                  <p className="mt-1 text-xs text-gray-400">Try a different search term or browse categories</p>
                </div>
              ) : null}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
