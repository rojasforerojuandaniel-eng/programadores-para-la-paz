"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency as fmtCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface PreviewInvoiceItem {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRate?: number | string;
  total?: number | string;
}

interface PreviewInvoice {
  number: string;
  status?: string;
  currency: string;
  issueDate: string | Date;
  dueDate?: string | Date | null;
  client?: {
    name?: string;
    email?: string | null;
    address?: string | null;
  };
  project?: { name?: string };
  items?: PreviewInvoiceItem[];
  subtotal?: number | string;
  taxRate?: number | string;
  taxAmount?: number | string;
  total?: number | string;
  notes?: string | null;
  terms?: string | null;
}

interface InvoicePreviewProps {
  invoice: PreviewInvoice;
  className?: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

const statusKeys: string[] = [
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "PARTIAL",
];

export function InvoicePreview({ invoice, className }: InvoicePreviewProps) {
  const t = useTranslations("dashboard.invoices");
  const locale = useLocale() as Locale;
  const items = invoice.items || [];
  const subtotal = toNumber(invoice.subtotal);
  const taxAmount = toNumber(invoice.taxAmount);
  const total = toNumber(invoice.total);

  const currency = (amount: number) => fmtCurrency(amount, invoice.currency, locale);
  const dateLabel = (value: string | Date | null | undefined) => {
    if (!value) return "—";
    return fmtDate(value, locale);
  };

  return (
    <Card className={`surface-elevated-2 overflow-hidden rounded-xl border-border ${className ?? ""}`}>
      <CardContent className="p-0">
        <div className="border-b border-border bg-muted/30 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t("preview.title", { number: invoice.number })}</h3>
              <p className="text-sm text-muted-foreground">
                {t("form.fields.issueDate")}: {dateLabel(invoice.issueDate)}
              </p>
              {invoice.dueDate && (
                <p className="text-sm text-muted-foreground">
                  {t("preview.dueLabel")}: {dateLabel(invoice.dueDate)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              {invoice.status && (
                <Badge variant="outline">
                  {statusKeys.includes(invoice.status)
                    ? t(`statuses.${invoice.status}` as never)
                    : invoice.status}
                </Badge>
              )}
              <span className="font-mono text-sm text-muted-foreground">{invoice.currency}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 border-b border-border p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("preview.from")}</p>
            <p className="mt-1 font-medium">{t("preview.yourOrganization")}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("preview.to")}</p>
            <p className="mt-1 font-medium">{invoice.client?.name || t("noClient")}</p>
            {invoice.client?.email && (
              <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
            )}
            {invoice.client?.address && (
              <p className="text-sm text-muted-foreground">{invoice.client.address}</p>
            )}
            {invoice.project?.name && (
              <p className="mt-1 text-sm text-muted-foreground">{t("preview.project")}: {invoice.project.name}</p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="hidden rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("preview.itemHeader")}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("form.placeholders.quantity")}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("form.placeholders.unitPrice")}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("columns.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">{item.description || "—"}</td>
                      <td className="px-4 py-3 text-right">{toNumber(item.quantity)}</td>
                      <td className="px-4 py-3 text-right">
                        {currency(toNumber(item.unitPrice))}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {currency(
                          toNumber(item.total) ||
                            toNumber(item.quantity) * toNumber(item.unitPrice)
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      {t("preview.noItems")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border md:hidden">
            {items.length > 0 ? (
              items.map((item, index) => (
                <li key={index} className="p-4">
                  <p className="font-medium">{item.description || "—"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {toNumber(item.quantity)} x{" "}
                    {currency(toNumber(item.unitPrice))}
                  </p>
                  <p className="mt-1 font-medium">
                    {currency(
                      toNumber(item.total) ||
                        toNumber(item.quantity) * toNumber(item.unitPrice)
                    )}
                  </p>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-muted-foreground">{t("preview.noItems")}</li>
            )}
          </ul>

          <div className="mt-6 flex flex-col gap-1 sm:items-end">
            <div className="flex justify-between gap-4 text-sm sm:justify-start">
              <span className="text-muted-foreground">{t("preview.subtotal")}</span>
              <span className="font-medium">{currency(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between gap-4 text-sm sm:justify-start">
                <span className="text-muted-foreground">
                  {t("preview.tax", { rate: toNumber(invoice.taxRate) })}
                </span>
                <span className="font-medium">{currency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 text-base font-semibold sm:justify-start">
              <span>{t("columns.total")}</span>
              <span>{currency(total)}</span>
            </div>
          </div>

          {(invoice.notes || invoice.terms) && (
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              {invoice.notes && (
                <p>
                  <span className="font-medium">{t("form.fields.notes")}:</span> {invoice.notes}
                </p>
              )}
              {invoice.terms && (
                <p>
                  <span className="font-medium">{t("form.fields.terms")}:</span> {invoice.terms}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
