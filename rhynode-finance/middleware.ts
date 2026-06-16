import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next({
    headers: { "x-rhynode-auth": "authenticated" },
  });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|sw.js|icon-192.png|icon-512.png|screenshots/).)*)",
  ],
};
