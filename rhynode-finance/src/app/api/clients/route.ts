import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
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
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const clients = await prisma.client.findMany({
        where: { organizationId: org.id },
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
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        userId: org.id,
        action: "CREATE_CLIENT",
        resource: "client",
        metadata: { name: parsed.data.name, email: parsed.data.email, country: parsed.data.country },
      });
      const client = await prisma.client.create({
        data: {
          organizationId: org.id,
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
