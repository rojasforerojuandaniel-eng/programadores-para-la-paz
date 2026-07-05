
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useIsClient } from "@/hooks/use-is-client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Users,
  Building2,
  Globe,
  CreditCard,
  Bell,
  Shield,
  Webhook,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { subscribeToPush, sendSubscriptionToServer } from "@/lib/push";
import {
  useNotificationPreferences,
  useOrganization,
  useSubscriptionPlan,
  useOrganizationMembers,
  usePaymentsHistory,
  type NotificationPreferences,
  type Organization,
  type Plan,
} from "@/hooks/use-dashboard-data";
import { ProfileSection } from "@/components/dashboard/settings/profile-section";
import { CompanySection } from "@/components/dashboard/settings/company-section";
import { LocalizationSection } from "@/components/dashboard/settings/localization-section";
import { BillingSection } from "@/components/dashboard/settings/billing-section";
import { NotificationsSection } from "@/components/dashboard/settings/notifications-section";
import { SecuritySection } from "@/components/dashboard/settings/security-section";
import { MembersSection } from "@/components/dashboard/settings/members-section";

interface TabItem {
  id: string;
  labelKey: string;
  icon: typeof User;
  href?: string;
}

const defaultOrg: Organization = {
  name: "",
  taxId: "",
  country: "CO",
  currency: "COP",
  timezone: "America/Bogota",
};

const defaultPlan: Plan = {
  name: "Starter",
  invoicesUsed: 0,
  invoicesLimit: 10,
  usersUsed: 1,
  usersLimit: 1,
};

const defaultNotifPrefs: NotificationPreferences = {
  budgets: true,
  subscriptions: true,
  weeklySummary: false,
};

const tabConfig: TabItem[] = [
  { id: "profile", labelKey: "tabs.profile", icon: User },
  { id: "company", labelKey: "tabs.company", icon: Building2 },
  { id: "localization", labelKey: "tabs.localization", icon: Globe },
  { id: "billing", labelKey: "tabs.billing", icon: CreditCard },
  { id: "members", labelKey: "tabs.members", icon: Users },
  { id: "notifications", labelKey: "tabs.notifications", icon: Bell },
  { id: "security", labelKey: "tabs.security", icon: Shield },
  { id: "webhooks", labelKey: "tabs.webhooks", icon: Webhook, href: "/dashboard/settings/webhook-logs" },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard.settings");

  const { data: orgData, isLoading: loading } = useOrganization();
  const { data: planData } = useSubscriptionPlan();
  const { data: membersData } = useOrganizationMembers();
  const { data: paymentsData, isLoading: paymentsLoading } = usePaymentsHistory();
  const { data: notifData, isLoading: notifLoading } = useNotificationPreferences();

  const [orgDraft, setOrgDraft] = useState<Partial<Organization>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [upgrading, setUpgrading] = useState(false);

  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const [notifDraft, setNotifDraft] = useState<Partial<NotificationPreferences>>({});
  const [notifSaving, setNotifSaving] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const membersCount = useMemo(() => {
    const members = Array.isArray(membersData?.members) ? membersData.members : [];
    return 1 + members.filter((m: { status?: string }) => m.status === "ACTIVE").length;
  }, [membersData]);

  const org = useMemo(
    () => ({ ...defaultOrg, ...orgData?.organization, ...orgDraft }),
    [orgData, orgDraft]
  );

  const plan = useMemo(
    () => ({ ...defaultPlan, ...planData?.plan, usersUsed: membersCount }),
    [planData, membersCount]
  );

  const payments = useMemo(
    () => (Array.isArray(paymentsData?.payments) ? paymentsData.payments : []),
    [paymentsData]
  );

  const notifPrefs = useMemo(
    () => ({ ...defaultNotifPrefs, ...notifData, ...notifDraft }),
    [notifData, notifDraft]
  );

  useEffect(() => {
    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    if (success) {
      router.replace("/dashboard/settings/billing/success");
    } else if (canceled) {
      router.replace("/dashboard/settings/billing/cancel");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setPushEnabled(!!sub);
      });
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
        setOrgDraft({ ...data.organization });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(t("toast.saveError"));
      }
    } catch {
      toast.error(t("toast.networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function updateNotifPrefs(key: keyof NotificationPreferences, value: boolean) {
    const updated = { ...notifPrefs, [key]: value };
    setNotifDraft(updated);
    setNotifSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("toast.prefsSaved"));
    } catch {
      toast.error(t("toast.prefsError"));
      setNotifDraft({});
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
          toast.success(t("toast.pushEnabled"));
        } else {
          toast.error(t("toast.pushRegisterError"));
        }
      } else {
        toast.error(t("toast.pushUnsupported"));
      }
    } catch {
      toast.error(t("toast.pushEnableError"));
    } finally {
      setPushLoading(false);
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
        toast.error(t("toast.checkoutError"));
      }
    } catch {
      toast.error(t("toast.networkError"));
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
    Math.round((plan.invoicesUsed / (plan.invoicesLimit || 1)) * 100)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="heading-section">{t("title")}</h1>
          {saved && (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success"
            >
              <CheckCircle className="h-3 w-3" />
              {t("saved")}
            </span>
          )}
        </div>
        <p className="body-default mt-1">{t("subtitle")}</p>
      </div>

      <Tabs
        defaultValue="profile"
        orientation="vertical"
        className="flex flex-col gap-4 lg:flex-row"
      >
        <TabsList className="w-full shrink-0 flex-row overflow-x-auto lg:w-64 lg:flex-col lg:overflow-visible">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const trigger = (
              <>
                <Icon className="h-4 w-4" />
                {t(tab.labelKey as never)}
              </>
            );
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="justify-start gap-2 max-lg:after:hidden lg:w-full"
                asChild={!!tab.href}
              >
                {tab.href ? (
                  <Link href={tab.href}>
                    {trigger}
                  </Link>
                ) : (
                  trigger
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="min-w-0 flex-1 space-y-4">
          <TabsContent value="profile">
            <ProfileSection
              theme={theme}
              mounted={mounted}
              onThemeChange={setTheme}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="company">
            <CompanySection org={org} onChange={setOrgDraft} saving={saving} />
          </TabsContent>

          <TabsContent value="localization">
            <LocalizationSection org={org} onChange={setOrgDraft} saving={saving} />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSection
              plan={plan}
              usagePercent={usagePercent}
              upgrading={upgrading}
              saving={saving}
              payments={payments}
              paymentsLoading={paymentsLoading}
              onUpgrade={handleUpgrade}
            />
          </TabsContent>

          <TabsContent value="members">
            <MembersSection />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSection
              prefs={notifPrefs}
              loading={notifLoading}
              saving={notifSaving || saving}
              pushEnabled={pushEnabled}
              pushLoading={pushLoading}
              onChange={updateNotifPrefs}
              onEnablePush={handleEnablePush}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySection />
          </TabsContent>
        </div>
      </Tabs>

      <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 p-4 backdrop-blur-sm lg:hidden">
        <Button type="submit" disabled={saving} className="w-full gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("saveChanges")
          )}
        </Button>
      </div>
    </form>
  );
}
