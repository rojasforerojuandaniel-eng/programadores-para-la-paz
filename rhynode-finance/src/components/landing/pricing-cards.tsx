"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  featured: boolean;
  checkoutPlan?: string | null;
  badge?: string;
}

export function PricingCards({ plans }: { plans: Plan[] }) {
  const t = useTranslations("pricing");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        toast.error(data.error || t("checkoutError"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="bg-muted/30 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("header")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${plan.featured ? "border-primary/50 ring-1 ring-primary/30 dark:border-primary dark:ring-primary" : "border-border/50 dark:border-border"}`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">
                  {plan.badge}
                </Badge>
              )}
              {!plan.badge && plan.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t("mostPopular")}</Badge>
              )}
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-card-foreground">
                  {plan.name}
                  {plan.badge ? (
                    <span className="sr-only"> — {plan.badge}</span>
                  ) : plan.featured ? (
                    <span className="sr-only"> — {t("mostPopular")}</span>
                  ) : null}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="my-4">
                  <span className="text-3xl font-bold text-card-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <ul className="mb-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-card-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.checkoutPlan ? (
                  <Button
                    className="w-full"
                    variant={plan.featured ? "default" : "outline"}
                    disabled={!!loading}
                    onClick={() => plan.checkoutPlan && handleCheckout(plan.checkoutPlan)}
                  >
                    {loading === plan.checkoutPlan ? t("redirecting") : plan.cta}
                  </Button>
                ) : (
                  <Button className="w-full" variant={plan.featured ? "default" : "outline"} asChild>
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}