"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={esMX}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
        <SpeedInsights />
      </ThemeProvider>
    </ClerkProvider>
  );
}
