"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Landmark,
  Lock,
  Sparkles,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";

function AnimatedBackground() {
  return (
    <div className="hero-gradient-mesh pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-1/4 h-80 w-80 rounded-full bg-chart-2/10 blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 right-1/3 h-56 w-56 rounded-full bg-chart-5/10 blur-3xl animate-pulse-glow" style={{ animationDelay: "4s" }} />
    </div>
  );
}

function TrustPill() {
  const t = useTranslations("hero");
  const items = [
    { icon: ShieldCheck, label: t("trustHecho") },
    { icon: Receipt, label: t("trustDian") },
    { icon: Lock, label: t("trustEncryption") },
    { icon: Landmark, label: t("trustBanks") },
  ];

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{item.label}</span>
            {i < items.length - 1 && (
              <span className="ml-2 hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroBadge() {
  const t = useTranslations("hero");
  return (
    <Badge
      variant="secondary"
      className="group mb-5 inline-flex h-8 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 sm:mb-6 sm:px-4 sm:text-sm"
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{t("badge")}</span>
      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Badge>
  );
}

function DashboardMockup() {
  const t = useTranslations("hero");
  const transactions = [
    { name: "Arriendo apartamento", type: "expense", amount: "-$1.850.000", icon: TrendingDown, color: "text-danger" },
    { name: "Factura cliente #1024", type: "income", amount: "+$4.200.000", icon: TrendingUp, color: "text-success" },
    { name: "Mercado éxito", type: "expense", amount: "-$420.000", icon: TrendingDown, color: "text-danger" },
  ];

  const bars = [35, 55, 40, 70, 50, 85, 60, 75, 45, 80, 65, 90];

  return (
    <div className="relative mx-auto w-full max-w-lg animate-float-delayed lg:mx-0">
      <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur-sm dark:bg-card/60">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-5" />
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("dashboard.totalBalance")}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">$ 12.845.000</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>+8.4% {t("dashboard.thisMonth")}</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-14 sm:w-14">
              <Wallet className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-5 flex items-end gap-1.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-primary/20 transition-all hover:bg-primary/40"
                style={{ height: `${h * 0.6}px` }}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => {
              const Icon = tx.icon;
              return (
                <div
                  key={tx.name}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5 sm:p-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-muted-foreground sm:h-9 sm:w-9">
                      <Icon className={`h-4 w-4 ${tx.color}`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground sm:text-sm">{tx.name}</p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">
                        {tx.type === "income" ? t("dashboard.income") : t("dashboard.expense")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold sm:text-sm ${tx.color}`}>{tx.amount}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="absolute -right-4 top-12 hidden w-44 animate-float rounded-xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-sm dark:bg-card/70 lg:block">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{t("dashboard.invoicePaid")}</p>
              <p className="text-sm font-semibold text-foreground">$ 4.200.000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="absolute -left-4 bottom-16 hidden w-40 animate-float rounded-xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-sm dark:bg-card/70 lg:block">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-5/10 text-chart-5">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{t("dashboard.aiAlert")}</p>
              <p className="text-sm font-semibold text-foreground">{t("dashboard.overspend")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FloatingStats() {
  const t = useTranslations("stats");
  const stats = [
    { value: t("usersValue"), label: t("usersLabel") },
    { value: t("managedValue"), label: t("managedLabel") },
    { value: t("ratingValue"), label: t("ratingLabel") },
  ];

  return (
    <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/40 pt-8 lg:mt-12">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</div>
          <div className="text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function HeroV3() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden px-4 pt-28 pb-16 md:pt-36 md:pb-24 lg:pt-40 lg:pb-32">
      <AnimatedBackground />

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="max-w-2xl text-center lg:text-left">
          <HeroBadge />

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {t("title")}
            <span className="bg-gradient-to-r from-primary via-chart-5 to-chart-2 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg md:mt-6 md:text-xl lg:mx-0">
            {t("subtitle")}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-8 lg:justify-start">
            <Button
              size="lg"
              className="group h-12 w-full gap-2 rounded-full text-base shadow-lg shadow-primary/20 sm:w-auto"
              asChild
            >
              <Link href="/sign-up">
                <Zap className="h-4 w-4" aria-hidden="true" />
                {t("ctaPrimary")}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-full text-base sm:w-auto"
              asChild
            >
              <Link href="#pricing">{t("ctaSecondary")}</Link>
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground md:mt-4">{t("fineprint")}</p>

          <div className="mt-6 hidden sm:block md:mt-8">
            <TrustPill />
          </div>

          <FloatingStats />
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}
