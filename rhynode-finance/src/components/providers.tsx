"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((mod) => mod.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false }
);

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
