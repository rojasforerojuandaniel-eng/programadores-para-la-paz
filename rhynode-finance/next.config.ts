import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://checkout.stripe.com https://js.stripe.com https://sandbox.wompi.co https://checkout.wompi.co",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://*.clerk.accounts.dev https://api.stripe.com https://sandbox.wompi.co https://production.wompi.co wss://*.clerk.accounts.dev",
  "frame-src https://checkout.stripe.com https://js.stripe.com https://sandbox.wompi.co https://checkout.wompi.co",
  "form-action 'self' https://checkout.stripe.com https://sandbox.wompi.co https://checkout.wompi.co",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(self)" },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/api/webhooks/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Activates client/server instrumentation. Source map upload only runs when
  // SENTRY_AUTH_TOKEN is set; otherwise it's a no-op (build stays clean).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});
