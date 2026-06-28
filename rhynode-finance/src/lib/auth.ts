import { auth, getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getPrisma } from "./prisma";
import type { UserScope } from "./scope";

export async function getUserProfile() {
  const session = await auth();
  const clerkId = session?.userId;
  if (!clerkId) return null;

  const prisma = getPrisma();

  let profile = await prisma.userProfile.findUnique({
    where: { clerkId },
  });

  if (!profile) {
    const email = session?.sessionClaims?.email as string | undefined;
    profile = await prisma.userProfile.create({
      data: {
        clerkId,
        email: email || "",
        scope: "PERSONAL",
        hasBusiness: false,
        onboardingCompleted: false,
      },
    });
  }

  return profile;
}

export async function getUserScope(): Promise<UserScope | null> {
  const profile = await getUserProfile();
  if (!profile) return null;
  return profile.scope as UserScope;
}

export async function requireAuth() {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) return null;

  const prisma = getPrisma();

  const org = await prisma.organization.findFirst({
    where: { slug: userId },
  });

  if (org) return org;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });

  return membership?.organization ?? null;
}

export async function getOrCreateAuthOrg() {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) return null;

  const prisma = getPrisma();

  // Ensure UserProfile exists
  let profile = await prisma.userProfile.findUnique({
    where: { clerkId: userId },
  });

  if (!profile) {
    const email = session?.sessionClaims?.email as string | undefined;
    profile = await prisma.userProfile.create({
      data: {
        clerkId: userId,
        email: email || "",
        scope: "PERSONAL",
        hasBusiness: false,
        onboardingCompleted: false,
      },
    });
  }

  let org = await prisma.organization.findFirst({
    where: { slug: userId },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Mi Empresa",
        slug: userId,
        country: "CO",
        currency: "COP",
        timezone: "America/Bogota",
        onboardingCompleted: false,
        userId: profile.id,
      },
    });
  }

  return org;
}

function bearerTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function clerkUserIdFromRequest(request: Request): Promise<string | null> {
  const bearer = bearerTokenFromRequest(request);
  if (!bearer) {
    const session = await auth();
    return session?.userId ?? null;
  }
  try {
    const clerkAuth = await getAuth(request as NextRequest);
    return clerkAuth?.userId ?? null;
  } catch {
    return null;
  }
}

export async function getUserProfileFromRequest(request: Request) {
  const userId = await clerkUserIdFromRequest(request);
  if (!userId) return null;

  const prisma = getPrisma();
  let profile = await prisma.userProfile.findUnique({ where: { clerkId: userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        clerkId: userId,
        email: "",
        scope: "PERSONAL",
        hasBusiness: false,
        onboardingCompleted: false,
      },
    });
  }
  return profile;
}

export async function getOrCreateAuthOrgFromRequest(request: Request) {
  const profile = await getUserProfileFromRequest(request);
  if (!profile) return null;

  const prisma = getPrisma();
  let org = await prisma.organization.findFirst({ where: { slug: profile.clerkId } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Mi Empresa",
        slug: profile.clerkId,
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
