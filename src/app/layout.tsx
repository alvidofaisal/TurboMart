import type { Metadata } from "next";
import "./globals.css";
import { SearchDropdownComponent } from "@/components/search-dropdown";
import { MenuIcon, ShoppingCart, User } from "lucide-react";
import React, { Suspense } from "react";
import { Cart } from "@/components/cart";
import { AuthServer } from "./auth.server";
import { Link } from "@/components/ui/link";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import { WelcomeToast } from "./welcome-toast";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  metadataBase: new URL("https://turbomart.example.com"),
  title: {
    template: "%s | TurboMart",
    default: "TurboMart",
  },
  description: "A high-performance, cost-free e-commerce platform with CockroachDB",
};

export const revalidate = false; // Disable revalidation during build

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} flex flex-col overflow-y-auto overflow-x-hidden antialiased`}
        suppressHydrationWarning
      >
        <>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white shadow-lg">
              {/* Top bar with logo, search, and user controls */}
              <div className="container mx-auto px-4">
                <div className="flex flex-col py-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left section: Logo */}
                  <div className="flex items-center justify-between">
                    <Link
                      prefetch={true}
                      href="/"
                      className="relative text-2xl font-bold text-white sm:text-3xl"
                    >
                      <span className="relative z-10">TurboMart</span>
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/60 via-orange-300/80 to-transparent"></span>
                    </Link>
                    <div className="flex items-center gap-2 sm:hidden">
                      <Link href="/order" aria-label="Cart" className="p-1">
                        <ShoppingCart size={22} className="text-white" />
                      </Link>
                      <Link href="/order-history" aria-label="Order History" className="p-1 sm:hidden">
                        <MenuIcon size={22} className="text-white" />
                      </Link>
                    </div>
                  </div>

                  {/* Middle section: Search (full width on mobile) */}
                  <div className="my-3 w-full sm:my-0 sm:max-w-md">
                    <SearchDropdownComponent />
                  </div>

                  {/* Right section: User controls */}
                  <div className="hidden items-center gap-6 sm:flex">
                    <div className="relative">
                      <Link
                        prefetch={true}
                        href="/order"
                        className="flex items-center gap-1 text-white/90 transition-colors hover:text-accent-300"
                      >
                        <ShoppingCart size={20} className="text-orange-200" />
                        <span>Cart</span>
                      </Link>
                      <Suspense>
                        <Cart />
                      </Suspense>
                    </div>
                    <div className="flex items-center gap-1">
                      <Suspense
                        fallback={
                          <button className="flex flex-row items-center gap-1 text-white/90 transition-colors hover:text-accent-300">
                            <User size={20} className="text-orange-200" />
                            <span>Account</span>
                          </button>
                        }
                      >
                        <AuthServer />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </header>
            
            <main className="flex-grow pb-12">{children}</main>

            <footer className="bg-primary-900 py-6 text-white">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Customer Service</h3>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/" className="hover:text-accent-200">Home</Link></li>
                      <li><Link href="/order" className="hover:text-accent-200">Cart</Link></li>
                      <li><Link href="/order-history" className="hover:text-accent-200">Order History</Link></li>
                      <li><Link href="/offline" className="hover:text-accent-200">Offline Mode</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">About TurboMart</h3>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/" className="hover:text-accent-200">Home</Link></li>
                      <li><Link href="/products" className="hover:text-accent-200">Products</Link></li>
                      <li><Link href="/scan" className="hover:text-accent-200">Scan</Link></li>
                      <li><Link href="/order" className="hover:text-accent-200">Cart</Link></li>
                    </ul>
                  </div>
                  <div className="sm:col-span-2">
                    <h3 className="mb-3 text-lg font-semibold">Stay Connected</h3>
                    <p className="mb-3 text-sm">Subscribe for updates on new products and exclusive offers.</p>
                    <div className="flex">
                      <input
                        type="email"
                        placeholder="Your email"
                        className="w-full rounded-l border-gray-300 px-3 py-2 text-black focus:outline-none"
                      />
                      <button className="rounded-r bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-500">
                        Subscribe
                      </button>
                    </div>
                    <div className="mt-4 text-xs">
                      <Link
                        href="https://github.com/yourusername/TurboMart"
                        className="hover:text-accent-200"
                        target="_blank"
                      >
                        View Source Code
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="mt-8 border-t border-primary-800 pt-6 text-center text-xs">
                  <p>© {new Date().getFullYear()} TurboMart. All rights reserved.</p>
                  <p className="mt-1">A high-performance, cost-free e-commerce platform.</p>
                </div>
              </div>
            </footer>
          </div>

          <Suspense fallback={null}>
            <Toaster closeButton />
            <WelcomeToast />
          </Suspense>
          <Analytics scriptSrc="/insights/events.js" endpoint="/hfi/events" />
        </>
      </body>
    </html>
  );
}
