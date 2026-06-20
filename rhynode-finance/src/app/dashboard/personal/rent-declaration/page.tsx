import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import { computeRentDeclaration } from "@/lib/rent-declaration";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, FileText } from "lucide-react";

function Row({
  label,
  value,
  strong,
  locale,
}: {
  label: string;
  value: number;
  strong?: boolean;
  locale: Locale;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>
        {formatCurrency(value, "COP", locale)}
      </span>
    </div>
  );
}

export default async function RentDeclarationPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; dependents?: string }>;
}) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.rent" });

  const profile = await getUserProfile();
  if (!profile) {
    return <p className="p-6 text-muted-foreground">{t("signIn")}</p>;
  }

  const params = await searchParams;
  const year = Number(params.year ?? new Date().getFullYear());
  const dependents = Number(params.dependents ?? 0);
  const org = await getOrCreateAuthOrg().catch(() => null);

  const result = await computeRentDeclaration({
    userId: profile.id,
    orgId: org?.id ?? null,
    year,
    dependents,
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <FileText className="size-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title", { year })}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card className="border-amber-400/30 bg-amber-400/5">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertCircle className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {t.rich("disclaimer", { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("kpis.grossIncome")}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(result.grossIncome, "COP", locale)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("kpis.exempt")}</CardDescription>
            <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">
              −{formatCurrency(result.exemptIncome, "COP", locale)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("deductions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label={t("rows.health")} value={result.deductions.health} locale={locale} />
          <Row label={t("rows.education")} value={result.deductions.education} locale={locale} />
          <Row label={t("rows.housing")} value={result.deductions.housing} locale={locale} />
          <Row label={t("rows.dependents", { count: dependents })} value={result.deductions.dependents} locale={locale} />
          <div className="border-t border-border pt-2">
            <Row label={t("rows.total")} value={result.deductions.total} strong locale={locale} />
            <Row label={t("rows.taxable")} value={result.taxableBase} strong locale={locale} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardDescription>{t("tax")}</CardDescription>
          <CardTitle className="text-3xl text-primary">{formatCurrency(result.tax, "COP", locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {t("effectiveRate", { rate: (result.effectiveRate * 100).toFixed(2) })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("notes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {result.notes.map((note, i) => (
            <p key={i}>• {note}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}