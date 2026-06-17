import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { generateInvoiceNumber } from "@/lib/invoices";

const createSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional(),
  number: z.string().optional(),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]).optional(),
  subtotal: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().min(0).optional(),
        unitPrice: z.number().min(0).optional(),
        discount: z.number().min(0).optional(),
        taxRate: z.number().min(0).optional(),
      })
    )
    .optional(),
});

export const GET = withRateLimit(
  async () => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const invoices = await prisma.invoice.findMany({
        where: { organizationId: org.id },
        include: { client: true, items: true, project: true },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ invoices });
    } catch (error) {
      logger.error("Failed to fetch invoices", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }
  },
  { key: "invoices-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const limitCheck = await checkPlanLimit(org.id, "invoices");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: "Límite de facturas alcanzado",
            message: `Tu plan permite ${limitCheck.limit} facturas. Actualiza tu plan para crear más.`,
          },
          { status: 403 }
        );
      }

      const body = await request.json();
      const parsed = createSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const {
        clientId,
        projectId,
        number: providedNumber,
        currency = "COP",
        subtotal = 0,
        taxRate = 19,
        taxAmount = 0,
        total = 0,
        issueDate,
        dueDate,
        notes,
        terms,
        items = [],
      } = parsed.data;

      // Validate ownership of referenced records
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client || client.organizationId !== org.id) {
        return NextResponse.json(
          { error: "Invalid client" },
          { status: 400 }
        );
      }

      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });
        if (!project || project.organizationId !== org.id) {
          return NextResponse.json(
            { error: "Invalid project" },
            { status: 400 }
          );
        }
      }

      // Auto-generate invoice number if not provided
      const number = providedNumber || (await generateInvoiceNumber(org.id));

      // Calculate totals from items if not provided
      let computedSubtotal = subtotal;
      let computedTaxAmount = taxAmount;
      let computedTotal = total;

      if (items.length > 0 && computedSubtotal === 0) {
        computedSubtotal = items.reduce((sum, item) => {
          const itemTotal =
            (item.quantity || 1) * (item.unitPrice || 0) - (item.discount || 0);
          return sum + itemTotal;
        }, 0);
        computedTaxAmount = (computedSubtotal * taxRate) / 100;
        computedTotal = computedSubtotal + computedTaxAmount;
      }

      const invoice = await prisma.invoice.create({
        data: {
          organizationId: org.id,
          clientId,
          projectId: projectId || null,
          number,
          currency,
          subtotal: computedSubtotal,
          taxRate,
          taxAmount: computedTaxAmount,
          total: computedTotal,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          notes,
          terms,
          items: {
            create: items.map((item) => {
              const itemSubtotal =
                (item.quantity || 1) * (item.unitPrice || 0) -
                (item.discount || 0);
              const itemTax = (itemSubtotal * (item.taxRate || taxRate)) / 100;
              return {
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                taxRate: item.taxRate || taxRate,
                taxAmount: itemTax,
                total: itemSubtotal + itemTax,
              };
            }),
          },
        },
        include: { client: true, items: true, project: true },
      });

      return NextResponse.json({ invoice });
    } catch (error) {
      logger.error("Failed to create invoice", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }
  },
  { key: "invoices", maxRequests: 10, windowMs: 60000 }
);
