import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canEdit, canView } from "@/lib/organization";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.enum(["CO", "MX", "BR", "AR", "CL", "PE"]).optional(),
});

export const GET = withRateLimit(
  async () => {
    try {
      const { userId: clerkUserId } = await auth();
      if (!clerkUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const ctx = await getCurrentOrganization(clerkUserId);
      if (!ctx || !canView(ctx.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const clients = await prisma.client.findMany({
        where: { organizationId: ctx.org.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ clients });
    } catch (error) {
      logger.error("Failed to fetch clients", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }
  },
  { key: "clients-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const { userId: clerkUserId } = await auth();
      if (!clerkUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const ctx = await getCurrentOrganization(clerkUserId);
      if (!ctx || !canEdit(ctx.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = await request.json();
      const parsed = createSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      auditLog({
        userId: ctx.org.id,
        action: "CREATE_CLIENT",
        resource: "client",
        metadata: { name: parsed.data.name, email: parsed.data.email, country: parsed.data.country },
      });
      const client = await prisma.client.create({
        data: {
          organizationId: ctx.org.id,
          ...parsed.data,
        },
      });

      return NextResponse.json({ client });
    } catch (error) {
      logger.error("Failed to create client", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to create client" },
        { status: 500 }
      );
    }
  },
  { key: "clients", maxRequests: 10, windowMs: 60000 }
);
