import { getPrisma } from "./prisma";
import {
  normalizeRole,
  type OrganizationRole,
  type MinimalOrganization,
  type MinimalOrganizationMember,
} from "./organization";

export interface OrganizationContext {
  org: MinimalOrganization;
  role: OrganizationRole;
}

export async function getCurrentOrganization(
  clerkUserId: string
): Promise<OrganizationContext | null> {
  const prisma = getPrisma();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: clerkUserId },
    include: { organization: { select: { id: true, name: true, plan: true, userId: true } } },
  });

  if (membership) {
    return {
      org: {
        id: membership.organization.id,
        name: membership.organization.name,
        plan: membership.organization.plan,
        userId: membership.organization.userId,
      },
      role: normalizeRole(membership.role),
    };
  }

  const owned = await prisma.organization.findFirst({
    where: { slug: clerkUserId },
    select: { id: true, name: true, plan: true, userId: true },
  });

  if (owned) {
    return {
      org: {
        id: owned.id,
        name: owned.name,
        plan: owned.plan,
        userId: owned.userId,
      },
      role: "ADMIN",
    };
  }

  return null;
}

export async function getOrganizationMembers(
  orgId: string
): Promise<MinimalOrganizationMember[]> {
  const prisma = getPrisma();
  return prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    orderBy: [{ role: "asc" }, { invitedAt: "desc" }],
  });
}
