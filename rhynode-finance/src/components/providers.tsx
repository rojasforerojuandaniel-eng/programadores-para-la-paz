"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerOfflineQueue } from "@/lib/offline-queue";
import { getClerkAppearance } from "@/lib/clerk-appearance";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((mod) => mod.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false }
);

function OfflineQueueRegister() {
  useEffect(() => {
    registerOfflineQueue();
  }, []);
  return null;
}

function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useHasMounted();
  const appearance = mounted ? getClerkAppearance(true) : getClerkAppearance(false);

  return (
    <ClerkProvider localization={esMX} appearance={appearance}>
      <QueryProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <OfflineQueueRegister />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </QueryProvider>
    </ClerkProvider>
  );
}
