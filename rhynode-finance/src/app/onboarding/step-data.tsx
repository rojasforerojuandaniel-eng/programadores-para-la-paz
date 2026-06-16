"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle2 } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UserScope } from "@/lib/scope";

interface StepDataProps {
  mode: UserScope;
  onBack: () => void;
}

interface LocaleMap {
  country: string;
  currency: string;
  timezone: string;
}

function detectLocale(): LocaleMap {
  const lang = typeof navigator !== "undefined" ? navigator.language : "es-CO";
  const region = lang.split("-")[1]?.toUpperCase() || "CO";

  const map: Record<string, LocaleMap> = {
    MX: { country: "MX", currency: "MXN", timezone: "America/Mexico_City" },
    BR: { country: "BR", currency: "BRL", timezone: "America/Sao_Paulo" },
    AR: { country: "AR", currency: "ARS", timezone: "America/Argentina/Buenos_Aires" },
    CL: { country: "CL", currency: "CLP", timezone: "America/Santiago" },
    PE: { country: "PE", currency: "PEN", timezone: "America/Lima" },
    US: { country: "US", currency: "USD", timezone: "America/New_York" },
    CO: { country: "CO", currency: "COP", timezone: "America/Bogota" },
  };

  return map[region] || map.CO;
}

export default function StepData({ mode, onBack }: StepDataProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isPersonal = mode === "PERSONAL" || mode === "BOTH";
  const isBusiness = mode === "BUSINESS" || mode === "BOTH";

  const locale = detectLocale();

  const [form, setForm] = useState(() => ({
    personalName: "",
    businessName: "",
    country: locale.country,
    currency: locale.currency,
    timezone: locale.timezone,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isPersonal && !form.personalName.trim()) {
      toast.error("Tu nombre es obligatorio.");
      return;
    }
    if (isBusiness && !form.businessName.trim()) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: isBusiness ? form.businessName : form.personalName,
          country: form.country,
          currency: form.currency,
          timezone: form.timezone,
          onboardingCompleted: true,
          scope: mode,
          hasBusiness: isBusiness,
        }),
      });

      if (res.ok) {
        toast.success("¡Listo! Redirigiendo al dashboard...");
        router.push("/dashboard");
      } else if (res.status === 401) {
        toast.error("Sesión expirada. Inicia sesión de nuevo.");
        router.push("/sign-in");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Error al guardar. Intenta de nuevo.");
      }
    } catch {
      toast.error("Error de red. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">Rhynode</span>
          </div>
          <h1 className="heading-section mt-4">Configura tu perfil</h1>
          <p className="body-default mt-1 text-muted-foreground">
            Completa estos datos para empezar a usar Rhynode.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isPersonal && (
            <Card className="surface-elevated-2">
              <CardHeader>
                <CardTitle2 className="heading-card flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" aria-hidden="true" />
                  Datos personales
                </CardTitle2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personal-name">Tu nombre *</Label>
                  <Input
                    id="personal-name"
                    required
                    value={form.personalName}
                    onChange={(e) => setForm({ ...form, personalName: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {isBusiness && (
            <Card className="surface-elevated-2">
              <CardHeader>
                <CardTitle2 className="heading-card flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  Datos de la empresa
                </CardTitle2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nombre de la empresa *</Label>
                  <Input
                    id="business-name"
                    required
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="Ej. Mi Empresa SAS"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="gap-2" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Atrás
            </Button>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  Ir al Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
