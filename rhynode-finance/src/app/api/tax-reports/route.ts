import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  period: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "ANNUAL"]),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  authority: z.enum(["DIAN", "SAT", "AFIP", "SII", "SUNAT"]),
  type: z.enum([
    "IVA",
    "ISR",
    "RETENTION",
    "ICA",
    "RENTA",
    "DIAN_ELECTRONIC",
  ]),
  dueDate: z.string().datetime().optional(),
  amount: z.number().optional(),
});

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await prisma.taxReport.findMany({
      where: { organizationId: org.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to fetch tax reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const report = await prisma.taxReport.create({
      data: {
        organizationId: org.id,
        ...parsed.data,
        dueDate: parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : null,
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to create tax report:", error);
    return NextResponse.json(
      { error: "Failed to create tax report" },
      { status: 500 }
    );
  }
}
