import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().optional(),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "VIRTUAL"]).optional(),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]).optional(),
  balance: z.number().optional(),
});

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
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

    const account = await prisma.bankAccount.create({
      data: {
        organizationId: org.id,
        ...parsed.data,
        type: parsed.data.type || "CHECKING",
        currency: parsed.data.currency || "COP",
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Failed to create bank account:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}
