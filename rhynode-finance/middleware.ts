import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-in/:path*",
  "/sign-up",
  "/sign-up/:path*",
  "/sso-callback",
  "/sso-callback/:path*",
  "/pay/:path*",
  "/api/webhooks/:path*",
  "/api/seed",
  "/api/cron/:path*",
  "/api/payment-links/public/:path*",
  "/api/payment-links/:path*/checkout/stripe",
  "/api/payment-links/:path*/checkout/wompi",
  "/offline",
  // Debug endpoints must NOT be public
  // "/api/health",
  // "/api/debug-dashboard",
  // "/api/schema-debug",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|sw.js|icon-192.png|icon-512.png|screenshots/).)*)",
  ],
};
