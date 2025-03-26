"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function WelcomeToast() {
  useEffect(() => {
    // ignore if screen height is too small
    if (window.innerHeight < 850) return;
    if (!document.cookie.includes("welcome-toast=3")) {
      toast("🚀 Welcome to TurboMart!", {
        id: "welcome-toast",
        duration: Infinity,
        onDismiss: () => {
          document.cookie += "welcome-toast=3;max-age=31536000";
        },
        description: (
          <>
            This is a high-performance, cost-free e-commerce platform built with 
            CockroachDB and Cloudflare. All of the products are AI generated.
            <hr className="my-2" />
            TurboMart demonstrates how to build a lightning-fast e-commerce site
            with zero hosting costs.{" "}
            <a
              href="https://github.com/yourusername/TurboMart"
              className="font-semibold text-accent1 hover:underline"
              target="_blank"
            >
              Get the Source
            </a>
            .
          </>
        ),
      });
    }
  }, []);

  return null;
}
