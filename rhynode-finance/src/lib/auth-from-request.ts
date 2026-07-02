import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getPrisma } from "./prisma";

function bearerTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function resolveProfileAndOrg(clerkId: string) {
  const prisma = getPrisma();

  let profile = await prisma.userProfile.findUnique({
    where: { clerkId },
  });

  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        clerkId,
        email: "",
        scope: "PERSONAL",
        hasBusiness: false,
        onboardingCompleted: false,
      },
    });
  }

  let org = await prisma.organization.findFirst({
    where: { slug: clerkId },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Mi Empresa",
        slug: clerkId,
        country: "CO",
        currency: "COP",
        timezone: "America/Bogota",
        onboardingCompleted: false,
        userId: profile.id,
      },
    });
  }

  return { profile, org };
}

/**
 * Resolves the authenticated organization/user from either cookies (web) or a
 * Bearer token sent by the mobile app.
 *
 * Clerk's `getAuth()` reads both session cookies and the `Authorization: Bearer`
 * header, so the mobile token path is handled by the same call. We still expose
 * the bearer extraction helper for callers that need to inspect the raw token.
 */
export async function requireAuthFromRequest(request: Request) {
  // Clerk's `getAuth()` reads both session cookies and the `Authorization: Bearer`
  // header used by the mobile app, so the token path is handled without manual
  // verification. The helper below is exposed for callers that need the raw token.
  try {
    const clerkAuth = await getAuth(request as NextRequest);
    const userId = clerkAuth?.userId;
    if (!userId) return null;

    const { profile, org } = await resolveProfileAndOrg(userId);
    return { userId, profile, org };
  } catch {
    return null;
  }
}

export function getBearerTokenFromRequest(request: Request): string | null {
  return bearerTokenFromRequest(request);
}

export async function getAuthOrgFromRequest(request: Request) {
  return requireAuthFromRequest(request);
}
