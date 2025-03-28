"use client";
import { Link } from "@/components/ui/link";
import NextImage from "next/image";
import { getImageProps } from "next/image";
import { Product } from "@/db/schema";
import { useEffect } from "react";
import { ShoppingCart } from "lucide-react";

export function getProductLinkImageProps(
  imageUrl: string,
  productName: string,
) {
  return getImageProps({
    width: 80,
    height: 80,
    quality: 75,
    src: imageUrl,
    alt: `${productName} product image`,
  });
}

export function ProductLink(props: {
  imageUrl?: string | null;
  category_slug: string;
  subcategory_slug: string;
  loading: "eager" | "lazy";
  product: Product;
}) {
  const { category_slug, subcategory_slug, product, imageUrl } = props;

  // prefetch the main image for the product page, if this is too heavy
  // we could only prefetch the first few cards, then prefetch on hover
  const prefetchProps = getImageProps({
    height: 300,
    quality: 80,
    width: 300,
    src: imageUrl ?? "/placeholder.svg?height=300&width=300",
    alt: `${product.name} product image`,
  });
  
  useEffect(() => {
    try {
      const iprops = prefetchProps.props;
      const img = new Image();
      // Don't interfer with important requests
      img.fetchPriority = "low";
      // Don't block the main thread with prefetch images
      img.decoding = "async";
      // Order is important here, sizes must be set before srcset, srcset must be set before src
      if (iprops.sizes) img.sizes = iprops.sizes;
      if (iprops.srcSet) img.srcset = iprops.srcSet;
      if (iprops.src) img.src = iprops.src;
    } catch (e) {
      console.error("failed to preload", prefetchProps.props.src, e);
    }
  }, [prefetchProps]);
  
  return (
    <Link
      prefetch={true}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
      href={`/products/${category_slug}/${subcategory_slug}/${product.slug}`}
    >
      <div className="relative bg-gray-50 p-4">
        {/* Optional "New" badge */}
        {Math.random() > 0.8 && (
          <span className="absolute left-2 top-2 rounded-full bg-primary-600 px-2 py-1 text-xs font-semibold uppercase text-white">
            New
          </span>
        )}
        
        <div className="relative mx-auto aspect-square h-40 w-40 overflow-hidden">
          <NextImage
            loading={props.loading}
            decoding="sync"
            src={imageUrl ?? "/placeholder.svg?height=160&width=160"}
            alt={`${product.name} product image`}
            fill
            style={{ objectFit: 'contain' }}
            className="transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 160px, 200px"
            quality={75}
          />
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 text-sm font-medium text-gray-800 group-hover:text-primary-700 md:text-base">
          {product.name}
        </h3>
        
        <p className="mb-2 line-clamp-2 flex-grow text-xs text-gray-600">
          {product.description}
        </p>
        
        <div className="mt-auto flex items-center justify-between">
          <span className="font-medium text-primary-700">
            ${(Math.random() * 100 + 9.99).toFixed(2)}
          </span>
          <button 
            className="rounded-full bg-primary-50 p-2 text-primary-700 transition-colors hover:bg-primary-100"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
}
