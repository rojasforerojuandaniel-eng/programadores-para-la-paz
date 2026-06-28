import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getUserProfile, requireAuth } from "./auth";

/**
 * Resolves the authenticated organization/user from either cookies (web) or a
 * Bearer token sent by the mobile app. Falls back to the existing cookie-based
 * helpers when no Authorization header is present.
 */
export async function requireAuthFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearerToken) {
    try {
      const clerkAuth = await getAuth(request as NextRequest);
      const userId = clerkAuth?.userId;
      if (!userId) return null;

      const profile = await getUserProfile();
      if (!profile) return null;

      const org = await requireAuth();
      return { userId, profile, org };
    } catch {
      return null;
    }
  }

  const org = await requireAuth();
  if (!org) return null;

  const profile = await getUserProfile();
  return { userId: profile?.clerkId ?? null, profile, org };
}

export async function getAuthOrgFromRequest(request: Request) {
  return requireAuthFromRequest(request);
}
