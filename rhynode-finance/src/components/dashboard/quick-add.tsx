"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { CreateTransactionSheet } from "./create-transaction-sheet";

/**
 * The single most important action in a finance app — recording money in or
 * out — made obvious and one tap away. Two goal-oriented buttons ("Gasté" /
 * "Recibí") that match the user's mental model and pre-set the form type, with
 * the amount field autofocused for fast entry. Placed in the sidebar (desktop)
 * and the mobile nav sheet so it's always visible.
 */
export function QuickAdd() {
  const router = useRouter();
  const t = useTranslations("dashboard.quickAdd");
  const refresh = () => router.refresh();

  return (
    <div role="group" aria-label={t("label")}>
      <div className="grid grid-cols-2 gap-2">
        <CreateTransactionSheet
          onCreate={refresh}
          defaultType="EXPENSE"
          trigger={
            <button
              type="button"
              aria-label={t("spentHint")}
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-danger/30 bg-danger/10 text-danger transition-colors hover:bg-danger/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ArrowDownCircle className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold">{t("spent")}</span>
            </button>
          }
        />
        <CreateTransactionSheet
          onCreate={refresh}
          defaultType="INCOME"
          trigger={
            <button
              type="button"
              aria-label={t("receivedHint")}
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-success/30 bg-success/10 text-success transition-colors hover:bg-success/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ArrowUpCircle className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold">{t("received")}</span>
            </button>
          }
        />
      </div>
    </div>
  );
}