import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/onboarding(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/debug-dashboard",
  "/api/economic-indicators",
  "/api/payment-links/public/(.*)",
  "/api/payment-links/([^/]+)/checkout/(.*)",
  "/api/payment-links/([^/]+)/pay",
  "/pay/(.*)",
  "/offline",
  "/ciudad(.*)",
  "/privacy",
  "/terms",
  "/support",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/sw.js",
  // English landing is public.
  "/en",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/debug-dashboard",
  "/api/economic-indicators",
  "/api/payment-links/public/(.*)",
  "/api/payment-links/([^/]+)/checkout/(.*)",
  "/api/payment-links/([^/]+)/pay",
]);

/**
 * Stage 1 of i18n only localizes the landing page. next-intl's middleware runs
 * exclusively for "/" and "/en" so every other route (including all protected
 * dashboard routes) passes through the original Clerk auth logic unchanged —
 * no auth behavior change outside the public landing.
 */
function isLocalizedLanding(pathname: string): boolean {
  return pathname === "/" || pathname === "/en";
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");

  // Only run next-intl for the localized landing; never for API.
  const intlResponse =
    !isApi && isLocalizedLanding(pathname) ? intlMiddleware(request) : null;

  const { userId, sessionId } = await auth();

  if (isPublicApiRoute(request) || isPublicRoute(request)) {
    return intlResponse ?? NextResponse.next();
  }

  if (!userId || !sessionId) {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    // Stage 1: protected routes are not yet localized → redirect to the
    // existing /sign-in. (Locale-aware redirects come when the dashboard is
    // localized in a later stage.)
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const response = intlResponse ?? NextResponse.next();
  response.headers.set("x-rhynode-auth", "authenticated");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};