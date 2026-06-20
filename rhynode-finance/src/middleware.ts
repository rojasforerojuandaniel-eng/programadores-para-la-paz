import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const publicPatterns = [
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
];

const publicApiPatterns = [
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/debug-dashboard",
  "/api/economic-indicators",
  "/api/payment-links/public/(.*)",
  "/api/payment-links/([^/]+)/checkout/(.*)",
  "/api/payment-links/([^/]+)/pay",
];

// The default locale (es) has no URL prefix (localePrefix: "as-needed"). Add
// prefixed variants for the non-default locales so /en/sign-in etc. are still
// treated as public by the Clerk matchers.
const nonDefaultLocales = routing.locales.filter((l) => l !== routing.defaultLocale);
const withLocalePrefix = (patterns: string[]) => [
  ...patterns,
  ...nonDefaultLocales.flatMap((l) =>
    patterns.map((p) => (p === "/" ? `/${l}` : `/${l}${p}`)),
  ),
];

const isPublicRoute = createRouteMatcher(withLocalePrefix(publicPatterns));
const isPublicApiRoute = createRouteMatcher(withLocalePrefix(publicApiPatterns));

function localeFromPath(pathname: string): string {
  for (const l of nonDefaultLocales) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return l;
  }
  return routing.defaultLocale;
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");

  // next-intl handles locale detection/cookie and /en rewrites for navigation
  // requests only. Skip it for API routes so JSON auth responses stay untouched.
  const intlResponse = isApi ? null : intlMiddleware(request);

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
    const locale = localeFromPath(pathname);
    const signInPath = locale === routing.defaultLocale ? "/sign-in" : `/${locale}/sign-in`;
    return NextResponse.redirect(new URL(signInPath, request.url));
  }

  const response = intlResponse ?? NextResponse.next();
  response.headers.set("x-rhynode-auth", "authenticated");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};