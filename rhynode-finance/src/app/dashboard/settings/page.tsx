"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useIsClient } from "@/hooks/use-is-client";
// import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Building2,
  CreditCard,
  CheckCircle,
  Loader2,
  Zap,
  Receipt,
  ExternalLink,
  Bell,
  Palette,
  Sun,
  Moon,
  Monitor,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { subscribeToPush, sendSubscriptionToServer } from "@/lib/push";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";

export default function SettingsPage() {
  // const router = useRouter();
  const [org, setOrg] = useState({
    name: "",
    taxId: "",
    country: "CO",
    currency: "COP",
    timezone: "America/Bogota",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [plan, setPlan] = useState({
    name: "Starter",
    invoicesUsed: 0,
    invoicesLimit: 10,
    usersUsed: 1,
    usersLimit: 1,
  });
  const [upgrading, setUpgrading] = useState(false);

  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const [notifPrefs, setNotifPrefs] = useState({
    budgets: true,
    subscriptions: true,
    weeklySummary: false,
  });
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setNotifPrefs({
          budgets: data.budgets ?? true,
          subscriptions: data.subscriptions ?? true,
          weeklySummary: data.weeklySummary ?? false,
        });
        setNotifLoading(false);
      })
      .catch(() => setNotifLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setPushEnabled(!!sub);
      });
    });
  }, []);

  async function updateNotifPrefs(key: keyof typeof notifPrefs, value: boolean) {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setNotifSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Preferencias guardadas");
    } catch {
      toast.error("Error al guardar preferencias");
      setNotifPrefs(notifPrefs);
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleEnablePush() {
    setPushLoading(true);
    try {
      const sub = await subscribeToPush();
      if (sub) {
        const ok = await sendSubscriptionToServer(sub);
        if (ok) {
          setPushEnabled(true);
          toast.success("Notificaciones push activadas");
        } else {
          toast.error("Error al registrar suscripción");
        }
      } else {
        toast.error("Tu navegador no soporta notificaciones push");
      }
    } catch {
      toast.error("Error al activar notificaciones");
    } finally {
      setPushLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        if (data.organization) {
          setOrg(data.organization);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/subscribe/plan")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        if (data.plan) setPlan(data.plan);
      })
      .catch(() => {
        // Plan endpoint not implemented yet, keep defaults
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(org),
      });
      if (res.ok) {
        const data = await res.json();
        setOrg(data.organization);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error("Error al guardar cambios");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpgrade(targetPlan: "GROWTH" | "SCALE") {
    setUpgrading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error al iniciar checkout. Verifica tu configuración de Stripe.");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const usagePercent = Math.min(
    100,
    Math.round((plan.invoicesUsed / plan.invoicesLimit) * 100)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="heading-section">Configuración</h1>
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-3 w-3" />
              Guardado
            </span>
          )}
        </div>
        <p className="body-default mt-1">Gestiona tu organización y preferencias</p>
      </div>

      {/* Plan Card */}
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Plan Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KpiCard label="Plan" value={plan.name} icon={TrendingUp} />
            <KpiCard
              label="Facturas"
              value={`${plan.invoicesUsed} / ${plan.invoicesLimit}`}
              icon={Receipt}
            />
            <KpiCard label="Usuarios" value={`${plan.usersUsed} / ${plan.usersLimit}`} icon={Users} />
            <KpiCard
              label="Uso"
              value={`${usagePercent}%`}
              icon={CheckCircle}
              valueClassName={usagePercent >= 90 ? "text-rose-400" : usagePercent >= 70 ? "text-amber-400" : "text-emerald-400"}
            />
          </div>

          <ProgressBar value={plan.invoicesUsed} max={plan.invoicesLimit} colorClassName="bg-primary" />
          <p className="text-xs text-muted-foreground">
            {usagePercent}% de tu límite de facturas utilizado
          </p>

          {plan.name === "Starter" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="surface-elevated-1 border-primary/20">
                <CardContent className="space-y-3 p-4">
                  <div className="font-medium">Growth — $29.900/mes</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>100 facturas/mes</li>
                    <li>3 usuarios</li>
                    <li>Clientes ilimitados</li>
                    <li>Compliance DIAN/SAT</li>
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpgrade("GROWTH")}
                    disabled={upgrading}
                  >
                    {upgrading ? "Procesando..." : "Elegir Growth"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="surface-elevated-1">
                <CardContent className="space-y-3 p-4">
                  <div className="font-medium">Scale — $79.900/mes</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Facturas ilimitadas</li>
                    <li>Usuarios ilimitados</li>
                    <li>API access</li>
                    <li>Soporte prioritario</li>
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpgrade("SCALE")}
                    disabled={upgrading}
                  >
                    {upgrading ? "Procesando..." : "Elegir Scale"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const res = await fetch("/api/subscribe/portal", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else toast.error("Error al abrir portal");
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Portal de Facturación
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-red-400"
              onClick={async () => {
                if (!confirm("¿Seguro que quieres cancelar tu suscripción?")) return;
                const res = await fetch("/api/subscribe/cancel", { method: "POST" });
                if (res.ok) {
                  toast.success("Suscripción cancelada");
                  window.location.reload();
                } else {
                  toast.error("Error al cancelar");
                }
              }}
            >
              Cancelar Suscripción
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Datos de la Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nombre</Label>
              <Input
                id="org-name"
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                placeholder="Mi Empresa SAS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-taxId">NIT / RFC / CNPJ</Label>
              <Input
                id="org-taxId"
                value={org.taxId || ""}
                onChange={(e) => setOrg({ ...org, taxId: e.target.value })}
                placeholder="900.123.456-7"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Regional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="settings-country">País</Label>
              <Select
                value={org.country}
                onValueChange={(v) => setOrg({ ...org, country: v })}
              >
                <SelectTrigger id="settings-country">
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
              <Label htmlFor="settings-currency">Moneda</Label>
              <Select
                value={org.currency}
                onValueChange={(v) => setOrg({ ...org, currency: v })}
              >
                <SelectTrigger id="settings-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP — Peso Colombiano</SelectItem>
                  <SelectItem value="MXN">MXN — Peso Mexicano</SelectItem>
                  <SelectItem value="BRL">BRL — Real Brasileño</SelectItem>
                  <SelectItem value="ARS">ARS — Peso Argentino</SelectItem>
                  <SelectItem value="CLP">CLP — Peso Chileno</SelectItem>
                  <SelectItem value="PEN">PEN — Sol Peruano</SelectItem>
                  <SelectItem value="USD">USD — Dólar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-timezone">Zona Horaria</Label>
              <Select
                value={org.timezone}
                onValueChange={(v) => setOrg({ ...org, timezone: v })}
              >
                <SelectTrigger id="settings-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Bogota">Bogotá</SelectItem>
                  <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
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

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-default">
            Conecta proveedores de pago locales para cobrar a tus clientes.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                name: "Wompi",
                desc: "Colombia — Tarjetas, PSE, Bancolombia",
                status: "Próximamente",
              },
              {
                name: "PayU",
                desc: "Multi-país — Tarjetas, efectivo",
                status: "Próximamente",
              },
              {
                name: "PSE",
                desc: "Colombia — Transferencia bancaria",
                status: "Próximamente",
              },
            ].map((p) => (
              <div key={p.name} className="surface-elevated-1 rounded-lg p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  disabled
                >
                  {p.status}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Apariencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-theme">Tema</Label>
            {mounted ? (
              <Select value={theme || "dark"} onValueChange={setTheme}>
                <SelectTrigger id="settings-theme" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Claro
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Oscuro
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Sistema
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-9 w-full sm:w-72 rounded-md border border-input bg-muted animate-pulse" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifLoading ? (
            <div className="space-y-3">
              <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" id="notif-budgets-title">Presupuestos</div>
                  <div className="text-sm text-muted-foreground" id="notif-budgets-desc">
                    Recibe alertas cuando gastes más del 80% de un presupuesto
                  </div>
                </div>
                <Switch
                  checked={notifPrefs.budgets}
                  onCheckedChange={(v) => updateNotifPrefs("budgets", v)}
                  disabled={notifSaving}
                  aria-labelledby="notif-budgets-title notif-budgets-desc"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" id="notif-subscriptions-title">Suscripciones</div>
                  <div className="text-sm text-muted-foreground" id="notif-subscriptions-desc">
                    Recordatorios antes de que venzan tus suscripciones
                  </div>
                </div>
                <Switch
                  checked={notifPrefs.subscriptions}
                  onCheckedChange={(v) => updateNotifPrefs("subscriptions", v)}
                  disabled={notifSaving}
                  aria-labelledby="notif-subscriptions-title notif-subscriptions-desc"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" id="notif-weekly-title">Resumen Semanal</div>
                  <div className="text-sm text-muted-foreground" id="notif-weekly-desc">
                    Recibe un resumen de tus finanzas cada semana
                  </div>
                </div>
                <Switch
                  checked={notifPrefs.weeklySummary}
                  onCheckedChange={(v) => updateNotifPrefs("weeklySummary", v)}
                  disabled={notifSaving}
                  aria-labelledby="notif-weekly-title notif-weekly-desc"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <div className="font-medium">Notificaciones Push</div>
              <div className="text-sm text-muted-foreground">
                {pushEnabled ? "Activado en este dispositivo" : "Desactivado"}
              </div>
            </div>
            <Button
              variant={pushEnabled ? "outline" : "default"}
              size="sm"
              onClick={handleEnablePush}
              disabled={pushLoading || pushEnabled}
            >
              {pushLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushEnabled ? (
                "Activado"
              ) : (
                "Activar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={saving} className="w-full gap-2 sm:w-auto">
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}
