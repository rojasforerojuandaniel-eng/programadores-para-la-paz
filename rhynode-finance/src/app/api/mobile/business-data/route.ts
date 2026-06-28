import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

const validTypes = new Set(["invoices", "clients", "projects"]);

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type");
      if (!type || !validTypes.has(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }

      const { org } = auth;

      switch (type) {
        case "invoices": {
          const invoices = await prisma.invoice.findMany({
            where: { organizationId: org.id },
            orderBy: { createdAt: "desc" },
            take: 50,
          });
          return NextResponse.json({ invoices });
        }
        case "clients": {
          const clients = await prisma.client.findMany({
            where: { organizationId: org.id },
            orderBy: { name: "asc" },
          });
          return NextResponse.json({ clients });
        }
        case "projects": {
          const projects = await prisma.project.findMany({
            where: { organizationId: org.id },
            orderBy: { createdAt: "desc" },
          });
          return NextResponse.json({ projects });
        }
        default:
          return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
    } catch (error) {
      logger.error("Mobile business data error", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to load business data" }, { status: 500 });
    }
  },
  { key: "mobile-business-data", maxRequests: 60, windowMs: 60000 }
);
