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
    include: { organization: { select: { id: true, name: true, plan: true } } },
  });

  if (membership) {
    return {
      org: membership.organization,
      role: normalizeRole(membership.role),
    };
  }

  const owned = await prisma.organization.findFirst({
    where: { slug: clerkUserId },
    select: { id: true, name: true, plan: true },
  });

  if (owned) {
    return { org: owned, role: "ADMIN" };
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
