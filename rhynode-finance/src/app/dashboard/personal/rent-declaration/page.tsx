import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { computeRentDeclaration } from "@/lib/rent-declaration";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, FileText } from "lucide-react";

function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function RentDeclarationPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; dependents?: string }>;
}) {
  const profile = await getUserProfile();
  if (!profile) {
    return <p className="p-6 text-muted-foreground">Inicia sesión para ver tu declaración.</p>;
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
          <h1 className="text-2xl font-bold tracking-tight">Declaración de Renta {year}</h1>
          <p className="text-sm text-muted-foreground">
            Estimación de planeación tributaria para personas naturales (tabla DT 2026).
          </p>
        </div>
      </div>

      <Card className="border-amber-400/30 bg-amber-400/5">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertCircle className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Esta es una <strong>estimación de planeación</strong>, no un documento tributario oficial.
            Los rubros deducibles se infieren por palabras clave en tus categorías. Confirma los
            valores con tu contador antes de presentar.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingreso bruto anual</CardDescription>
            <CardTitle className="text-2xl">{formatCop(result.grossIncome)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Renta exenta (25%, tope)</CardDescription>
            <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">
              −{formatCop(result.exemptIncome)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deducciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Salud (16%, tope)" value={result.deductions.health} />
          <Row label="Educación (tope)" value={result.deductions.education} />
          <Row label="Intereses vivienda (tope)" value={result.deductions.housing} />
          <Row label={`Dependientes (${dependents})`} value={result.deductions.dependents} />
          <div className="border-t border-border pt-2">
            <Row label="Total deducciones" value={result.deductions.total} strong />
            <Row label="Base gravable" value={result.taxableBase} strong />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardDescription>Impuesto estimado a cargo</CardDescription>
          <CardTitle className="text-3xl text-primary">{formatCop(result.tax)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Tasa efectiva: {(result.effectiveRate * 100).toFixed(2)}% sobre el ingreso bruto.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas</CardTitle>
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

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{formatCop(value)}</span>
    </div>
  );
}