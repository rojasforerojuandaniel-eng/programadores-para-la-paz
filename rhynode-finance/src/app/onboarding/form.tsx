"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    country: "CO",
    currency: "COP",
    timezone: "America/Bogota",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboardingCompleted: true }),
      });

      if (res.ok) {
        toast.success("¡Empresa configurada! Redirigiendo al dashboard...");
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
          <h1 className="heading-section mt-4">Configura tu empresa</h1>
          <p className="body-default mt-1 text-muted-foreground">
            Completa estos datos para empezar a facturar en menos de 2 minutos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="surface-elevated-2">
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Datos básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nombre de la empresa *</Label>
                <Input
                  id="org-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Mi Empresa SAS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-taxId">NIT / RFC / CNPJ</Label>
                <Input
                  id="org-taxId"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  placeholder="900.123.456-7"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2">
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Ubicación y moneda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="org-country">País</Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => setForm({ ...form, country: v })}
                  >
                    <SelectTrigger id="org-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="MX">México</SelectItem>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="CL">Chile</SelectItem>
                      <SelectItem value="PE">Perú</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-currency">Moneda</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger id="org-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="CLP">CLP</SelectItem>
                      <SelectItem value="PEN">PEN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-timezone">Zona horaria</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(v) => setForm({ ...form, timezone: v })}
                  >
                    <SelectTrigger id="org-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Bogota">Bogotá</SelectItem>
                      <SelectItem value="America/Mexico_City">CDMX</SelectItem>
                      <SelectItem value="America/Sao_Paulo">São Paulo</SelectItem>
                      <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires</SelectItem>
                      <SelectItem value="America/Santiago">Santiago</SelectItem>
                      <SelectItem value="America/Lima">Lima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Ir al Dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
