import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/en",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/onboarding(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/mobile/health",
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
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/mobile/health",
  "/api/debug-dashboard",
  "/api/economic-indicators",
  "/api/payment-links/public/(.*)",
  "/api/payment-links/([^/]+)/checkout/(.*)",
  "/api/payment-links/([^/]+)/pay",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionId } = await auth();

  if (isPublicApiRoute(request) || isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (!userId || !sessionId) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-rhynode-auth", "authenticated");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};