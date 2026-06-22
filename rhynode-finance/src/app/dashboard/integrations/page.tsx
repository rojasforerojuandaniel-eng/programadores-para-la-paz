"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/locale";
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

const categoryLabelKeys: Record<IntegrationCategory, string> = {
  banks: "categories.banks",
  accounting: "categories.accounting",
  payments: "categories.payments",
  automation: "categories.automation",
};

const categories: Record<
  IntegrationCategory,
  { labelKey: string; order: number; icon: typeof Landmark }
> = {
  banks: { labelKey: categoryLabelKeys.banks, order: 0, icon: Landmark },
  accounting: { labelKey: categoryLabelKeys.accounting, order: 1, icon: Calculator },
  payments: { labelKey: categoryLabelKeys.payments, order: 2, icon: CreditCard },
  automation: { labelKey: categoryLabelKeys.automation, order: 3, icon: Zap },
};

const integrationsSeed: Integration[] = [
  {
    id: "bancolombia",
    name: "Bancolombia",
    category: "banks",
    status: "coming-soon",
    initials: "BA",
    color: "#FDB913",
  },
  {
    id: "davivienda",
    name: "Davivienda",
    category: "banks",
    status: "coming-soon",
    initials: "DA",
    color: "#ED1C24",
  },
  {
    id: "nequi",
    name: "Nequi",
    category: "banks",
    status: "coming-soon",
    initials: "NQ",
    color: "#6F2DA8",
  },
  {
    id: "siigo",
    name: "SIIGO",
    category: "accounting",
    status: "coming-soon",
    initials: "SI",
    color: "#00A7E1",
  },
  {
    id: "alegra",
    name: "Alegra",
    category: "accounting",
    status: "coming-soon",
    initials: "AL",
    color: "#635BFF",
  },
  {
    id: "wompi",
    name: "Wompi",
    category: "payments",
    status: "connected",
    initials: "WO",
    color: "#7B4BFF",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    status: "available",
    initials: "ST",
    color: "#635BFF",
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "automation",
    status: "coming-soon",
    initials: "ZA",
    color: "#FF4A00",
  },
  {
    id: "make",
    name: "Make",
    category: "automation",
    status: "coming-soon",
    initials: "MA",
    color: "#6F00FF",
  },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function IntegrationsPage() {
  const t = useTranslations("dashboard.integrations");
  const locale = useLocale() as Locale;
  const [integrations, setIntegrations] =
    useState<Integration[]>(integrationsSeed);
  const [waitlist, setWaitlist] = useState<Record<string, WaitlistEntry>>({});
  const [expandedWaitlist, setExpandedWaitlist] = useState<string | null>(null);
  const [waitlistForm, setWaitlistForm] = useState<WaitlistFormState>({
    name: "",
    email: "",
  });

  useEffect(() => {
    fetch("/api/personal/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "integrationWaitlist" in data &&
          data.integrationWaitlist &&
          typeof data.integrationWaitlist === "object" &&
          !Array.isArray(data.integrationWaitlist)
        ) {
          setWaitlist(data.integrationWaitlist as Record<string, WaitlistEntry>);
        }
      })
      .catch(() => null);
  }, []);

  function handleConnect(id: string) {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "connected" } : item))
    );
    toast.success(t("toasts.connected"));
  }

  function handleDisconnect(id: string) {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "available" } : item))
    );
    toast.success(t("toasts.disconnected"));
  }

  function handleConfigure(name: string) {
    toast.info(t("toasts.configure", { name }));
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
      toast.error(t("toasts.invalidForm"));
      return;
    }

    const entry: WaitlistEntry = {
      name: waitlistForm.name.trim(),
      email: waitlistForm.email.trim().toLowerCase(),
      joinedAt: new Date().toISOString(),
    };

    const next = { ...waitlist, [id]: entry };
    setWaitlist(next);
    fetch("/api/personal/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrationWaitlist: next }),
    }).catch(() => null);
    setExpandedWaitlist(null);
    setWaitlistForm({ name: "", email: "" });
    toast.success(t("toasts.waitlistSuccess"));
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
        <h1 className="heading-section">{t("title")}</h1>
        <p className="body-default mt-1">{t("subtitle")}</p>
      </div>

      <Card className="surface-elevated-2 border border-primary/20">
        <CardContent className="flex items-start gap-4 p-4 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{t("openBankingBanner.title")}</p>
            <p className="body-small text-muted-foreground">
              {t("openBankingBanner.description")}
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
                  {t(categories[category].labelKey as never)}
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
            {t("openBankingCard.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("openBankingCard.intro")}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("openBankingCard.bullet1")}</li>
            <li>{t("openBankingCard.bullet2")}</li>
            <li>{t("openBankingCard.bullet3")}</li>
            <li>{t("openBankingCard.bullet4")}</li>
          </ul>
          <p>
            {t("openBankingCard.outroBefore")}{" "}
            <strong>{t("openBankingCard.outroBold")}</strong>{" "}
            {t("openBankingCard.outroAfter")}
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
  const t = useTranslations("dashboard.integrations");
  const isJoined = Boolean(waitlistEntry);

  function statusBadge() {
    if (integration.status === "connected") {
      return (
        <Badge
          variant="outline"
          className="border-success/30 bg-success/10 text-success"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {t("statuses.connected")}
        </Badge>
      );
    }
    if (integration.status === "available") {
      return <Badge variant="default">{t("statuses.available")}</Badge>;
    }
    return <Badge variant="secondary">{t("statuses.comingSoon")}</Badge>;
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
            <p className="body-small mt-1">
              {t(`descriptions.${integration.id}` as never)}
            </p>
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
                {t("actions.configure")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDisconnect}
              >
                <Unplug className="h-4 w-4" />
                {t("actions.disconnect")}
              </Button>
            </div>
          )}

          {integration.status === "available" && (
            <Button size="sm" className="w-full gap-2" onClick={onConnect}>
              <Plug className="h-4 w-4" />
              {t("actions.connect")}
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
                  {t("waitlist.joined")}
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
                      {t("waitlist.join")}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid gap-1.5">
                        <Label
                          htmlFor={`waitlist-name-${integration.id}`}
                          className="text-xs"
                        >
                          {t("waitlist.nameLabel")}
                        </Label>
                        <Input
                          id={`waitlist-name-${integration.id}`}
                          value={formName}
                          onChange={(e) =>
                            onFormChange("name", e.target.value)
                          }
                          placeholder={t("waitlist.namePlaceholder")}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label
                          htmlFor={`waitlist-email-${integration.id}`}
                          className="text-xs"
                        >
                          {t("waitlist.emailLabel")}
                        </Label>
                        <Input
                          id={`waitlist-email-${integration.id}`}
                          type="email"
                          value={formEmail}
                          onChange={(e) =>
                            onFormChange("email", e.target.value)
                          }
                          placeholder={t("waitlist.emailPlaceholder")}
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
                          {t("waitlist.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={onWaitlistSubmit}
                        >
                          {t("waitlist.submit")}
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