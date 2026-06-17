import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { PLANS } from "@/lib/subscription";
import { normalizeRole, canAdmin, type OrganizationRole } from "@/lib/organization";
import { getCurrentOrganization } from "@/lib/organization.server";
import { logger } from "@/lib/logger";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]),
});

interface MemberItem {
  id: string;
  userId: string;
  role: OrganizationRole;
  status: "PENDING" | "ACTIVE";
  email: string | null;
  name: string | null;
  invitedAt: string;
  joinedAt: string | null;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(userId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: ctx.org.id },
      orderBy: [{ role: "asc" }, { invitedAt: "desc" }],
    });

    const userIds = members.map((m) => m.userId).filter(Boolean);
    let clerkUsers: Array<{ id: string; emailAddresses: Array<{ emailAddress: string }>; firstName?: string | null; lastName?: string | null }> = [];
    if (userIds.length > 0) {
      try {
        const client = await clerkClient();
        const list = await client.users.getUserList({ userId: userIds });
        clerkUsers = list.data.map((u) => ({
          id: u.id,
          emailAddresses: u.emailAddresses.map((e) => ({ emailAddress: e.emailAddress })),
          firstName: u.firstName,
          lastName: u.lastName,
        }));
      } catch {
        clerkUsers = [];
      }
    }

    const userProfiles = await prisma.userProfile.findMany({
      where: { clerkId: { in: userIds } },
      select: { clerkId: true, email: true, name: true },
    });

    const result: MemberItem[] = members.map((member) => {
      const clerkUser = clerkUsers.find((u) => u.id === member.userId);
      const profile = userProfiles.find((p) => p.clerkId === member.userId);
      const email =
        clerkUser?.emailAddresses[0]?.emailAddress ?? profile?.email ?? null;
      const name = clerkUser
        ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
        : profile?.name ?? null;

      return {
        id: member.id,
        userId: member.userId,
        role: normalizeRole(member.role),
        status: member.joinedAt ? "ACTIVE" : "PENDING",
        email,
        name,
        invitedAt: member.invitedAt.toISOString(),
        joinedAt: member.joinedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ members: result });
  } catch (error) {
    logger.error("Failed to list members", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(userId);
    if (!ctx || !canAdmin(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: ctx.org.id },
    });
    const totalUsers = 1 + memberCount;
    const planName = (ctx.org.plan as keyof typeof PLANS) || "STARTER";
    const limit = PLANS[planName]?.limits.users ?? 1;

    if (limit !== Infinity && totalUsers >= limit) {
      return NextResponse.json(
        { error: "Límite de usuarios alcanzado para tu plan" },
        { status: 403 }
      );
    }

    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList({
      emailAddress: [parsed.data.email],
    });

    const targetUser = clerkUsers.data[0];
    if (!targetUser) {
      return NextResponse.json(
        { error: "No se encontró un usuario registrado con ese email" },
        { status: 404 }
      );
    }

    const existing = await prisma.organizationMember.findFirst({
      where: {
        organizationId: ctx.org.id,
        userId: targetUser.id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "El usuario ya es miembro de esta organización" },
        { status: 409 }
      );
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: ctx.org.id,
        userId: targetUser.id,
        role: parsed.data.role,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        member: {
          id: member.id,
          userId: member.userId,
          role: normalizeRole(member.role),
          status: "PENDING" as const,
          email: targetUser.emailAddresses[0]?.emailAddress ?? null,
          name:
            [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || null,
          invitedAt: member.invitedAt.toISOString(),
          joinedAt: null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Failed to invite member", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}
