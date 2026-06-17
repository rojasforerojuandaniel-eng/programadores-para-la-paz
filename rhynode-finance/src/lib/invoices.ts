import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function generateInvoiceNumber(orgId: string): Promise<string> {
  const prisma = getPrisma();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: {
      organizationId: orgId,
      number: { startsWith: prefix },
    },
    orderBy: { number: "desc" },
  });

  let sequence = 1;
  if (latest) {
    const parts = latest.number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function duplicateInvoice(orgId: string, id: string) {
  const prisma = getPrisma();

  const existing = await prisma.invoice.findUnique({
    where: { id, organizationId: orgId },
    include: { items: true },
  });

  if (!existing) {
    throw new Error("Invoice not found");
  }

  const number = await generateInvoiceNumber(orgId);

  const config =
    existing.config && typeof existing.config === "object"
      ? (existing.config as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const data: Prisma.InvoiceCreateInput = {
    organization: { connect: { id: orgId } },
    client: { connect: { id: existing.clientId } },
    ...(existing.projectId
      ? { project: { connect: { id: existing.projectId } } }
      : {}),
    number,
    status: "DRAFT",
    currency: existing.currency,
    subtotal: existing.subtotal,
    taxRate: existing.taxRate,
    taxAmount: existing.taxAmount,
    total: existing.total,
    issueDate: new Date(),
    dueDate: existing.dueDate ? new Date(existing.dueDate) : null,
    notes: existing.notes,
    terms: existing.terms,
    scope: existing.scope,
    config: config as unknown as Prisma.InputJsonValue,
    items: {
      create: existing.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        total: item.total,
      })),
    },
  };

  const invoice = await prisma.invoice.create({
    data,
    include: { client: true, items: true, project: true },
  });

  return invoice;
}
