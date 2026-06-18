/**
 * Next.js instrumentation hook. Registers Sentry on the server and edge
 * runtimes. The sentry config files self-disable when NEXT_PUBLIC_SENTRY_DSN /
 * SENTRY_DSN are not set, so this is safe to ship without credentials — it
 * activates the moment Sentry env vars are configured.
 *
 * Client-side Sentry requires `withSentryConfig` in next.config + a DSN; that
 * is intentionally left out for now to avoid build-time source-map upload
 * steps, but server/edge error capture (API routes, cron jobs, middleware)
 * works through this hook.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}