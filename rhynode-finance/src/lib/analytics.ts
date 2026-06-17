import { track } from "@vercel/analytics";

export type TrackProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackEvent(name: string, properties?: TrackProperties): void {
  if (typeof window === "undefined") return;

  try {
    const safeProperties = properties
      ? Object.fromEntries(
          Object.entries(properties).filter(([, value]) => value !== undefined),
        )
      : undefined;

    track(name, safeProperties);
  } catch {
    // Analytics unavailable — fail silently so business logic is never blocked.
  }
}
