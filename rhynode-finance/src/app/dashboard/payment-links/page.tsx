import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { prisma } from "@/lib/prisma";
import { getLocale, setRequestLocale } from "next-intl/server";
import { PaymentLinksClient } from "@/components/dashboard/payment-links-client";
import type { PaymentLink } from "@/components/dashboard/payment-link-actions";

export default async function PaymentLinksPage() {
  const locale = await getLocale();
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) return null;

  const ctx = await getCurrentOrganization(userId);
  if (!ctx) return null;

  const canEdit = ctx.role === "ADMIN" || ctx.role === "MANAGER";

  const rows = await prisma.paymentLink.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: { createdAt: "desc" },
  });

  const initialLinks: PaymentLink[] = rows.map((link) => ({
    id: link.id,
    name: link.name,
    description: link.description ?? null,
    amount: Number(link.amount),
    currency: link.currency,
    status: link.status as "ACTIVE" | "INACTIVE",
    urlSlug: link.urlSlug,
    maxPayments: link.maxPayments ?? null,
    currentPayments: link.currentPayments,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
  }));

  return (
    <PaymentLinksClient initialLinks={initialLinks} canEdit={canEdit} />
  );
}
