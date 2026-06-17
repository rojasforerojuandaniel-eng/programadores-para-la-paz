"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Landmark,
  Calculator,
  CreditCard,
  Zap,
  Link as LinkIcon,
  Bell,
  CheckCircle2,
  Settings,
  Plug,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

type IntegrationStatus = "connected" | "available" | "coming-soon";
type IntegrationCategory = "banks" | "accounting" | "payments" | "automation";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  initials: string;
  color: string;
}

interface WaitlistEntry {
  name: string;
  email: string;
  joinedAt: string;
}

interface WaitlistFormState {
  name: string;
  email: string;
}

const categories: Record<
  IntegrationCategory,
  { label: string; order: number; icon: typeof Landmark }
> = {
  banks: { label: "Bancos", order: 0, icon: Landmark },
  accounting: { label: "Contabilidad", order: 1, icon: Calculator },
  payments: { label: "Pagos", order: 2, icon: CreditCard },
  automation: { label: "Automatización", order: 3, icon: Zap },
};

const integrationsSeed: Integration[] = [
  {
    id: "bancolombia",
    name: "Bancolombia",
    description:
      "Sincroniza corrientes, ahorros y tarjetas de crédito automáticamente.",
    category: "banks",
    status: "coming-soon",
    initials: "BA",
    color: "#FDB913",
  },
  {
    id: "davivienda",
    name: "Davivienda",
    description:
      "Importa movimientos y saldos de Davivienda en tiempo real.",
    category: "banks",
    status: "coming-soon",
    initials: "DA",
    color: "#ED1C24",
  },
  {
    id: "nequi",
    name: "Nequi",
    description: "Conecta tu banco digital y rastrea gastos del día a día.",
    category: "banks",
    status: "coming-soon",
    initials: "NQ",
    color: "#6F2DA8",
  },
  {
    id: "siigo",
    name: "SIIGO",
    description:
      "Envía facturas y concilia pagos con tu contabilidad en la nube.",
    category: "accounting",
    status: "coming-soon",
    initials: "SI",
    color: "#00A7E1",
  },
  {
    id: "alegra",
    name: "Alegra",
    description: "Integra facturación electrónica y estados financieros.",
    category: "accounting",
    status: "coming-soon",
    initials: "AL",
    color: "#635BFF",
  },
  {
    id: "wompi",
    name: "Wompi",
    description:
      "Recibe pagos con tarjeta, PSE, Nequi y Daviplata en Colombia.",
    category: "payments",
    status: "connected",
    initials: "WO",
    color: "#7B4BFF",
  },
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Procesa pagos internacionales con tarjetas y métodos globales.",
    category: "payments",
    status: "available",
    initials: "ST",
    color: "#635BFF",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automatiza flujos entre Rhynode y 5,000+ aplicaciones.",
    category: "automation",
    status: "coming-soon",
    initials: "ZA",
    color: "#FF4A00",
  },
  {
    id: "make",
    name: "Make",
    description: "Crea escenarios visuales para sincronizar datos sin código.",
    category: "automation",
    status: "coming-soon",
    initials: "MA",
    color: "#6F00FF",
  },
];

const WAITLIST_STORAGE_KEY = "rhynode_integration_waitlist_v1";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getStoredWaitlist(): Record<string, WaitlistEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, WaitlistEntry>;
    }
  } catch {
    // Ignore corrupted localStorage data.
  }
  return {};
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(integrationsSeed);
  const [waitlist, setWaitlist] = useState<Record<string, WaitlistEntry>>(
    getStoredWaitlist
  );
  const [expandedWaitlist, setExpandedWaitlist] = useState<string | null>(null);
  const [waitlistForm, setWaitlistForm] = useState<WaitlistFormState>({
    name: "",
    email: "",
  });

  function updateWaitlistStorage(next: Record<string, WaitlistEntry>) {
    try {
      localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore if localStorage is unavailable.
    }
  }

  function handleConnect(id: string) {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "connected" } : item))
    );
    toast.success("Integración conectada");
  }

  function handleDisconnect(id: string) {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "available" } : item))
    );
    toast.success("Integración desconectada");
  }

  function handleConfigure(name: string) {
    toast.info(`Abriendo configuración de ${name}...`);
  }

  function toggleWaitlist(id: string) {
    setExpandedWaitlist((prev) => {
      const next = prev === id ? null : id;
      if (next !== id) {
        setWaitlistForm({ name: "", email: "" });
      }
      return next;
    });
  }

  function updateWaitlistForm(field: keyof WaitlistFormState, value: string) {
    setWaitlistForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleWaitlistSubmit(id: string) {
    if (!waitlistForm.name.trim() || !isValidEmail(waitlistForm.email)) {
      toast.error("Ingresa un nombre y un email válido");
      return;
    }

    const entry: WaitlistEntry = {
      name: waitlistForm.name.trim(),
      email: waitlistForm.email.trim().toLowerCase(),
      joinedAt: new Date().toISOString(),
    };

    const next = { ...waitlist, [id]: entry };
    setWaitlist(next);
    updateWaitlistStorage(next);
    setExpandedWaitlist(null);
    setWaitlistForm({ name: "", email: "" });
    toast.success("Te notificaremos cuando esté disponible");
  }

  const grouped = useMemo(() => {
    const map = new Map<IntegrationCategory, Integration[]>();
    for (const item of integrations) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries()).sort(
      (a, b) => categories[a[0]].order - categories[b[0]].order
    );
  }, [integrations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Integraciones</h1>
        <p className="body-default mt-1">
          Conecta bancos, contabilidad, pasarelas de pago y automatización en un
          solo lugar.
        </p>
      </div>

      <Card className="surface-elevated-2 border border-primary/20">
        <CardContent className="flex items-start gap-4 p-4 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Open Banking está llegando a Colombia</p>
            <p className="body-small text-muted-foreground">
              El Decreto 0368 de 2026 obliga a todos los bancos a exponer APIs
              seguras. Rhynode será uno de los primeros en integrarse.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {grouped.map(([category, items]) => {
          const CategoryIcon = categories[category].icon;
          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {categories[category].label}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <IntegrationCard
                    key={item.id}
                    integration={item}
                    waitlistEntry={waitlist[item.id]}
                    isExpanded={expandedWaitlist === item.id}
                    formName={waitlistForm.name}
                    formEmail={waitlistForm.email}
                    onConnect={() => handleConnect(item.id)}
                    onDisconnect={() => handleDisconnect(item.id)}
                    onConfigure={() => handleConfigure(item.name)}
                    onToggleWaitlist={() => toggleWaitlist(item.id)}
                    onFormChange={updateWaitlistForm}
                    onWaitlistSubmit={() => handleWaitlistSubmit(item.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            ¿Qué es Open Banking?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Open Banking permite que apps autorizadas accedan a tus datos
            bancarios de forma segura, con tu permiso explícito. Esto significa:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Tus transacciones se importan automáticamente sin escribir nada
            </li>
            <li>La IA categoriza tus gastos al instante</li>
            <li>Recibes alertas de anomalías en tiempo real</li>
            <li>Tus datos están encriptados y nunca se venden</li>
          </ul>
          <p>
            En Colombia, el <strong>Decreto 0368 de abril 2026</strong> hizo
            Open Finance obligatorio para todas las entidades financieras
            supervisadas por la SFC.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface IntegrationCardProps {
  integration: Integration;
  waitlistEntry?: WaitlistEntry;
  isExpanded: boolean;
  formName: string;
  formEmail: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
  onToggleWaitlist: () => void;
  onFormChange: (field: keyof WaitlistFormState, value: string) => void;
  onWaitlistSubmit: () => void;
}

function IntegrationCard({
  integration,
  waitlistEntry,
  isExpanded,
  formName,
  formEmail,
  onConnect,
  onDisconnect,
  onConfigure,
  onToggleWaitlist,
  onFormChange,
  onWaitlistSubmit,
}: IntegrationCardProps) {
  const isJoined = Boolean(waitlistEntry);

  function statusBadge() {
    if (integration.status === "connected") {
      return (
        <Badge
          variant="outline"
          className="border-success/30 bg-success/10 text-success"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Conectado
        </Badge>
      );
    }
    if (integration.status === "available") {
      return <Badge variant="default">Disponible</Badge>;
    }
    return <Badge variant="secondary">Próximamente</Badge>;
  }

  return (
    <Card className="surface-elevated-2 flex flex-col">
      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{
              backgroundColor: `${integration.color}1A`,
              color: integration.color,
            }}
            aria-hidden="true"
          >
            {integration.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold leading-snug text-foreground">
                {integration.name}
              </h3>
              {statusBadge()}
            </div>
            <p className="body-small mt-1">{integration.description}</p>
          </div>
        </div>

        <div className="mt-auto pt-4">
          {integration.status === "connected" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={onConfigure}
              >
                <Settings className="h-4 w-4" />
                Configurar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDisconnect}
              >
                <Unplug className="h-4 w-4" />
                Desconectar
              </Button>
            </div>
          )}

          {integration.status === "available" && (
            <Button size="sm" className="w-full gap-2" onClick={onConnect}>
              <Plug className="h-4 w-4" />
              Conectar
            </Button>
          )}

          {integration.status === "coming-soon" && (
            <div className="space-y-3">
              {isJoined ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Te avisaremos
                </Button>
              ) : (
                <>
                  {!isExpanded ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={onToggleWaitlist}
                    >
                      <Bell className="h-4 w-4" />
                      Unirme a la lista
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid gap-1.5">
                        <Label
                          htmlFor={`waitlist-name-${integration.id}`}
                          className="text-xs"
                        >
                          Nombre
                        </Label>
                        <Input
                          id={`waitlist-name-${integration.id}`}
                          value={formName}
                          onChange={(e) =>
                            onFormChange("name", e.target.value)
                          }
                          placeholder="Tu nombre"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label
                          htmlFor={`waitlist-email-${integration.id}`}
                          className="text-xs"
                        >
                          Email
                        </Label>
                        <Input
                          id={`waitlist-email-${integration.id}`}
                          type="email"
                          value={formEmail}
                          onChange={(e) =>
                            onFormChange("email", e.target.value)
                          }
                          placeholder="tu@empresa.com"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={onToggleWaitlist}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={onWaitlistSubmit}
                        >
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
