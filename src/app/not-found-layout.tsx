'use client';

import React from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export default function NotFoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} flex flex-col overflow-y-auto overflow-x-hidden antialiased`}
        suppressHydrationWarning
      >
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
} 