"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { PricingCards } from "./pricing-cards";
import { HeroV3 } from "./hero-v3";
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Receipt,
  Briefcase,
  FileText,
  Calculator,
  ShieldCheck,
  Smartphone,
  Menu,
  X,
  FileCheck,
  Lock,
  Star,
  ChevronDown,
  Users,
  BadgeCheck,
  Mail,
  ExternalLink,
  Building2,
} from "lucide-react";

const NAV_LINKS = [
  { href: "#features", key: "features" },
  { href: "#pricing", key: "pricing" },
  { href: "#testimonials", key: "testimonials" },
  { href: "#faq", key: "faq" },
] as const;

const FEATURE_KEYS = [
  { key: "budgets", icon: Wallet, audience: "personal" },
  { key: "goals", icon: PiggyBank, audience: "personal" },
  { key: "expenses", icon: Receipt, audience: "personal" },
  { key: "invoicing", icon: FileText, audience: "business" },
  { key: "receivables", icon: Briefcase, audience: "business" },
  { key: "taxes", icon: Calculator, audience: "business" },
] as const;

const STEP_KEYS = ["01", "02", "03"] as const;

const TESTIMONIAL_KEYS = [
  { key: "mfl", initials: "MFL", rating: 5 },
  { key: "car", initials: "CAR", rating: 5 },
  { key: "dt", initials: "DT", rating: 5 },
] as const;

const PLAN_KEYS: ReadonlyArray<{
  key: "starter" | "growth" | "scale";
  href: string;
  featured: boolean;
  checkoutPlan: string | null;
  badgeKey?: "comingSoon";
}> = [
  { key: "starter", href: "/sign-up", featured: false, checkoutPlan: null },
  { key: "growth", href: "/sign-up?plan=growth", featured: true, checkoutPlan: null, badgeKey: "comingSoon" },
  { key: "scale", href: "/sign-up?plan=scale", featured: false, checkoutPlan: "SCALE" },
];

const FAQ_KEYS = [
  "accountant",
  "dian",
  "payments",
  "personalOnly",
  "security",
  "price",
  "mobile",
  "bank",
] as const;

function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const links = NAV_LINKS.map((l) => ({ href: l.href, label: t(l.key) }));

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo href="/" />

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">{t("signIn")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">{t("signUp")}</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t("openMenu")}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 border-r border-border/50 bg-background/95 backdrop-blur-md"
          >
            <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
            <div className="flex flex-col gap-6 py-6">
              <div className="flex items-center justify-between">
                <Logo href="/" />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label={t("closeMenu")}>
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col gap-4 text-base font-medium">
                {links.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <a
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
              </nav>
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm text-muted-foreground">{t("theme")}</span>
                  <div className="flex items-center gap-2">
                    <LocaleSwitcher />
                    <ThemeToggle />
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/sign-in">{t("signIn")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">{t("signUp")}</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function TrustBadges() {
  const t = useTranslations("trustBadges");
  const items = [
    { icon: Lock, label: t("encryption") },
    { icon: FileCheck, label: t("dian") },
    { icon: BadgeCheck, label: t("wompi") },
    { icon: Smartphone, label: t("pwa") },
    { icon: Users, label: t("spanish") },
    { icon: ShieldCheck, label: t("noData") },
  ];

  return (
    <section className="border-y border-border/50 bg-muted/30 px-4 py-5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-success" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatsSection() {
  const t = useTranslations("stats");
  const stats = [
    { value: t("usersValue"), label: t("usersLabel") },
    { value: t("managedValue"), label: t("managedLabel") },
    { value: t("ratingValue"), label: t("ratingLabel") },
    { value: t("uptimeValue"), label: t("uptimeLabel") },
  ];

  return (
    <section className="border-y border-border/50 bg-background px-4 py-10">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 text-center md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BanksStrip() {
  const t = useTranslations("banks");
  const banks = t("list").split(", ");

  return (
    <section className="border-y border-border/50 bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("heading")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {banks.map((bank) => (
            <span
              key={bank}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground md:text-base"
            >
              {bank}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function FeaturesGrid() {
  const t = useTranslations("features");

  return (
    <section id="features" className="px-4 py-14 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <Badge variant="secondary" className="mb-3">
            {t("sectionBadge")}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("sectionTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {t("sectionSubtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((f) => {
            const Icon = f.icon;
            const title = t(`items.${f.key}.title`);
            const description = t(`items.${f.key}.description`);
            const audience = t(f.audience);
            return (
              <Card
                key={f.key}
                className="border-border/50 bg-card transition hover:border-primary/30 dark:border-border"
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <Badge
                      variant={f.audience === "business" ? "outline" : "secondary"}
                      className="text-xs"
                    >
                      {audience}
                    </Badge>
                  </div>
                  <h3 className="mb-1 font-semibold text-card-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("howItWorks");

  return (
    <section className="bg-muted/30 px-4 py-14 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground md:mb-14 md:text-4xl">
          {t("title")}
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {STEP_KEYS.map((step) => (
            <div
              key={step}
              className="relative rounded-2xl border border-border/50 bg-card p-6 dark:border-border"
            >
              <span className="text-5xl font-bold text-primary/20">
                {step}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`steps.${step}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const t = useTranslations("testimonials");

  return (
    <section id="testimonials" className="px-4 py-14 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIAL_KEYS.map((item) => {
            const name = t(`items.${item.key}.name`);
            const role = t(`items.${item.key}.role`);
            const quote = t(`items.${item.key}.quote`);
            return (
              <Card key={item.key} className="border-border/50 bg-card dark:border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-1 text-warning">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-current"
                        aria-hidden="true"
                      />
                    ))}
                    <span className="sr-only">
                      {item.rating} / 5
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-card-foreground">
                    “{quote}”
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <Avatar initials={item.initials} />
                    <div>
                      <p className="font-semibold text-card-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const t = useTranslations("pricing");
  const plans = PLAN_KEYS.map((p) => {
    const badge = p.badgeKey ? t(p.badgeKey) : undefined;
    return {
      name: t(`plans.${p.key}.name`),
      price: t(`plans.${p.key}.price`),
      period: p.key === "starter" ? undefined : t(`plans.${p.key}.period`),
      description: t(`plans.${p.key}.description`),
      features: t.raw(`plans.${p.key}.features`) as string[],
      cta: t(`plans.${p.key}.cta`),
      href: p.href,
      featured: p.featured,
      checkoutPlan: p.checkoutPlan ?? undefined,
      badge,
    };
  });

  return <PricingCards plans={plans} />;
}

function Faq() {
  const t = useTranslations("faq");

  return (
    <section id="faq" className="bg-muted/30 px-4 py-14 md:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_KEYS.map((key) => {
            const question = t(`items.${key}.q`);
            const answer = t(`items.${key}.a`);
            return (
              <details
                key={key}
                className="group rounded-xl border border-border/50 bg-card dark:border-border"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-semibold text-card-foreground transition-colors hover:bg-muted focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                  {question}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground">{answer}</p>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  const t = useTranslations("cta");

  return (
    <section className="px-4 py-14 md:py-24">
      <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-primary/20 to-accent/30 p-8 text-center md:p-12 dark:from-primary/40 dark:to-accent/50">
        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-12 w-full gap-2 text-base sm:w-auto" asChild>
            <Link href="/sign-up">
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              {t("primary")}
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full text-base sm:w-auto"
            asChild
          >
            <Link href="/sign-in">{t("secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations("footer");
  const footerLinks = [
    {
      categoryKey: "product" as const,
      links: [
        { labelKey: "features", href: "#features" },
        { labelKey: "pricing", href: "#pricing" },
        { labelKey: "testimonials", href: "#testimonials" },
        { labelKey: "faq", href: "#faq" },
      ],
    },
    {
      categoryKey: "company" as const,
      links: [
        { labelKey: "help", href: "/support" },
        { labelKey: "contact", href: "/support" },
        { labelKey: "status", href: "https://status.rhynode.finance", external: true },
      ],
    },
    {
      categoryKey: "resources" as const,
      links: [
        { labelKey: "twitter", href: "https://twitter.com/rhynode", external: true },
        { labelKey: "linkedin", href: "https://linkedin.com/company/rhynode", external: true },
        { labelKey: "instagram", href: "https://instagram.com/rhynode", external: true },
      ],
    },
    {
      categoryKey: "legal" as const,
      links: [
        { labelKey: "privacy", href: "/privacy" },
        { labelKey: "terms", href: "/terms" },
        { labelKey: "cookies", href: "/cookies" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/50 bg-background px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold text-foreground">Rhynode</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://twitter.com/rhynode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={t("srTwitter")}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="mailto:hola@rhynode.finance"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={t("srEmail")}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://linkedin.com/company/rhynode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={t("srLinkedIn")}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.categoryKey}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t(`categories.${group.categoryKey}`)}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.labelKey}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {t(`links.${link.labelKey}`)}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {t(`links.${link.labelKey}`)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy">{t("links.privacy")}</Link>
            <Link href="/terms">{t("links.terms")}</Link>
            <Link href="/cookies">{t("links.cookies")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StickyMobileCta() {
  const t = useTranslations();
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-16 border-t border-border/50 bg-background/95 px-4 py-2 backdrop-blur-xl md:hidden">
      <Button size="lg" className="h-full w-full text-base" asChild>
        <Link href="/sign-up">{t("stickyCta")}</Link>
      </Button>
    </div>
  );
}

function LandingSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Rhynode",
        url: "https://rhynode.finance",
        logo: "https://rhynode.finance/icon-192x192.png",
        sameAs: [
          "https://twitter.com/rhynode",
          "https://linkedin.com/company/rhynode",
        ],
        description:
          "Rhynode une finanzas personales e inteligencia contable para personas y pymes en Colombia.",
        areaServed: {
          "@type": "Country",
          name: "Colombia",
        },
      },
      {
        "@type": "WebSite",
        name: "Rhynode",
        url: "https://rhynode.finance",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://rhynode.finance/dashboard?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Rhynode",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web, iOS, Android",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "COP",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          ratingCount: "120",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LandingPageV2() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-background pb-24 md:pb-0"
    >
      <LandingSchema />
      <Navbar />
      <HeroV3 />
      <TrustBadges />
      <StatsSection />
      <BanksStrip />
      <FeaturesGrid />
      <HowItWorks />
      <TestimonialsSection />
      <Pricing />
      <Faq />
      <Cta />
      <Footer />
      <StickyMobileCta />
    </main>
  );
}