"use client";

import { useState } from "react";
import Image from "next/image";

export function HeroBackground() {
  const [imageError, setImageError] = useState(false);
  
  return (
    <>
      {!imageError ? (
        <div className="absolute inset-0 z-0">
          <Image
            src="/turbomart-1.png"
            alt="TurboMart shopping experience - Speed visualized with dynamic red light streaks"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            className="opacity-100"
            priority
            onError={() => {
              console.error('Image failed to load');
              setImageError(true);
            }}
          />
        </div>
      ) : (
        // Fallback CSS-based background
        <>
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary-800 to-primary-900"></div>
          
          {/* Diagonal speed lines */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rotate-[30deg] bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-60"></div>
            <div className="absolute left-0 top-1/3 h-[3px] w-full -translate-y-1/2 rotate-[30deg] bg-gradient-to-r from-transparent via-primary-300 to-transparent opacity-70"></div>
            <div className="absolute left-0 top-2/3 h-[4px] w-full -translate-y-1/2 rotate-[30deg] bg-gradient-to-r from-transparent via-white to-transparent opacity-40"></div>
            <div className="absolute left-0 top-3/4 h-[1px] w-full -translate-y-1/2 rotate-[30deg] bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50"></div>
          </div>
          
          {/* Particle effect */}
          <div className="absolute inset-0 z-0">
            <div className="absolute h-1 w-1 rounded-full bg-white opacity-70" style={{ top: '20%', left: '30%' }}></div>
            <div className="absolute h-1 w-1 rounded-full bg-white opacity-50" style={{ top: '40%', left: '70%' }}></div>
            <div className="absolute h-1 w-1 rounded-full bg-white opacity-60" style={{ top: '70%', left: '40%' }}></div>
            <div className="absolute h-1 w-1 rounded-full bg-white opacity-80" style={{ top: '60%', left: '80%' }}></div>
            <div className="absolute h-1 w-1 rounded-full bg-white opacity-60" style={{ top: '80%', left: '20%' }}></div>
            <div className="absolute h-[2px] w-[2px] rounded-full bg-white opacity-90" style={{ top: '30%', left: '60%' }}></div>
            <div className="absolute h-[2px] w-[2px] rounded-full bg-white opacity-70" style={{ top: '50%', left: '10%' }}></div>
            <div className="absolute h-[2px] w-[2px] rounded-full bg-white opacity-80" style={{ top: '75%', left: '50%' }}></div>
          </div>
          
          {/* Glow effect */}
          <div className="absolute left-1/2 top-1/2 z-0 h-32 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500 opacity-20 blur-3xl"></div>
        </>
      )}
    </>
  );
} 