import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency, formatDate as formatDateLocale } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { CircularProgress } from "@/components/dashboard/circular-progress";
import { ProgressRowsSkeleton } from "@/components/dashboard/page-skeleton";
import { TableCell } from "@/components/ui/table";
import { CreateGoalDialog } from "./create-dialog";
import { AddSavingsDialog } from "./add-savings-dialog";
import { daysLeft, progressPercentage, suggestGoalBasedOnAverage } from "@/lib/finance-math";
import { Target, CheckCircle2, Wallet, Calendar, Sparkles } from "lucide-react";

function deadlineBadgeVariant(days: number | null, isCompleted: boolean) {
  if (isCompleted) return "default";
  if (days === null) return "outline";
  if (days < 0) return "destructive";
  if (days <= 7) return "secondary";
  return "outline";
}

interface GoalsPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.goals" });

  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const goals = await prisma.goal.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalTarget = goals.reduce((s, g) => s + decimalToNumber(g.targetAmount), 0);
  const totalCurrent = goals.reduce((s, g) => s + decimalToNumber(g.currentAmount), 0);
  const completed = goals.filter((g) => g.status === "COMPLETED").length;

  const suggestion = suggestGoalBasedOnAverage(
    goals.map((g) => ({
      targetAmount: decimalToNumber(g.targetAmount),
      currentAmount: decimalToNumber(g.currentAmount),
      deadline: g.deadline,
    })),
  );

  const columns = [
    { key: "name", header: t("columns.name") },
    { key: "target", header: t("columns.target") },
    { key: "saved", header: t("columns.saved") },
    { key: "progress", header: t("columns.progress") },
    { key: "deadline", header: t("columns.deadline") },
    { key: "status", header: t("columns.status") },
    { key: "actions", header: t("columns.actions") },
  ];

  const fmtDate = (date: Date | string | null | undefined) =>
    date ? formatDateLocale(date, locale, { year: "numeric", month: "short", day: "numeric" }) : null;

  const deadlineLabel = (days: number | null): string | null => {
    if (days === null) return null;
    if (days < 0) return t("deadline.overdue", { days: Math.abs(days) });
    if (days === 0) return t("deadline.today");
    return t("deadline.left", { days });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateGoalDialog defaultOpen={searchParams?.new === "1"} />
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label={t("total")} value={formatCurrency(totalTarget, "COP", locale)} icon={Target} />
          <KpiCard
            label={t("saved")}
            value={formatCurrency(totalCurrent, "COP", locale)}
            icon={Wallet}
            valueClassName="text-success"
          />
          <KpiCard label={t("completed")} value={completed} icon={CheckCircle2} />
        </div>
      )}

      {suggestion && (
        <div className="surface-elevated-2 rounded-xl border border-border p-4 sm:p-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">{t("suggestion.title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("suggestion.body", {
                    average: formatCurrency(suggestion.monthlyAverage, "COP", locale),
                    target: formatCurrency(suggestion.suggestedTarget, "COP", locale),
                  })}
                </p>
              </div>
            </div>
            <CreateGoalDialog
              defaultValues={{
                name: t("suggestion.suggestedName"),
                targetAmount: Math.round(suggestion.suggestedTarget),
                currency: "COP",
                deadline: suggestion.suggestedDeadline,
                icon: "Target",
                color: "",
              }}
              trigger={
                <button type="button" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  {t("suggestion.cta")}
                </button>
              }
            />
          </div>
        </div>
      )}

      <Suspense fallback={<ProgressRowsSkeleton rows={3} />}>
        <ServerDataTable
          columns={columns}
          data={goals}
          emptyState={
            <EmptyStateCard
              variant="lg"
              icon={Target}
              title={t("empty.title")}
              description={t("empty.description")}
              hint={t("empty.hint")}
              action={<CreateGoalDialog defaultOpen={searchParams?.new === "1"} />}
            />
          }
          renderRow={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = progressPercentage(currentAmount, targetAmount);
            const isCompleted = goal.status === "COMPLETED";
            const goalDaysLeft = daysLeft(goal.deadline);

            return (
              <>
                <TableCell className="py-3 font-medium">{goal.name}</TableCell>
                <TableCell className="py-3">{formatCurrency(targetAmount, goal.currency, locale)}</TableCell>
                <TableCell className="py-3 font-medium">{formatCurrency(currentAmount, goal.currency, locale)}</TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      value={progress}
                      size={40}
                      strokeWidth={5}
                      colorClassName={isCompleted ? "text-success" : "text-primary"}
                      trackClassName="text-muted"
                    />
                    <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {goal.deadline ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {fmtDate(goal.deadline)}
                      </span>
                      {goalDaysLeft !== null && (
                        <Badge variant={deadlineBadgeVariant(goalDaysLeft, isCompleted)} className="w-fit text-xs">
                          {deadlineLabel(goalDaysLeft)}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("noDate")}</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={isCompleted ? "default" : "outline"}>
                    {isCompleted ? t("statusCompleted") : t("statusActive")}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  {!isCompleted && (
                    <AddSavingsDialog goalId={goal.id} goalName={goal.name} currency={goal.currency} />
                  )}
                </TableCell>
              </>
            );
          }}
          renderCard={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = progressPercentage(currentAmount, targetAmount);
            const isCompleted = goal.status === "COMPLETED";
            const goalDaysLeft = daysLeft(goal.deadline);
            const colorClass = isCompleted ? "text-success" : "text-primary";

            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(goal.deadline)}
                      </p>
                    )}
                  </div>
                  <Badge variant={isCompleted ? "default" : "outline"}>
                    {isCompleted ? t("statusCompleted") : t("statusActive")}
                  </Badge>
                </div>

                <div className="flex items-center justify-center py-2">
                  <CircularProgress
                    value={progress}
                    size={110}
                    strokeWidth={10}
                    colorClassName={colorClass}
                    trackClassName="text-muted"
                    label={<span className="text-lg font-bold">{progress.toFixed(0)}%</span>}
                  />
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold tracking-tight">{formatCurrency(currentAmount, goal.currency, locale)}</div>
                  <div className="text-sm text-muted-foreground">{t("of", { amount: formatCurrency(targetAmount, goal.currency, locale) })}</div>
                </div>

                {goalDaysLeft !== null && (
                  <Badge variant={deadlineBadgeVariant(goalDaysLeft, isCompleted)} className="w-fit self-center">
                    {deadlineLabel(goalDaysLeft)}
                  </Badge>
                )}

                {isCompleted && (
                  <div className="rounded-lg bg-success/10 px-3 py-2 text-center text-sm text-success" role="status">
                    {t("reached")}
                  </div>
                )}

                {!isCompleted && (
                  <div className="flex items-center justify-end pt-1">
                    <AddSavingsDialog goalId={goal.id} goalName={goal.name} currency={goal.currency} />
                  </div>
                )}
              </div>
            );
          }}
        />
      </Suspense>
    </div>
  );
}