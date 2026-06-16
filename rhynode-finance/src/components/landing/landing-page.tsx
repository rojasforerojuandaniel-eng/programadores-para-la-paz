"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PricingCards } from "./pricing-cards";
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Receipt,
  Briefcase,
  FileText,
  Calculator,
  ShieldCheck,
  Zap,
  ArrowRight,
  Check,
  Smartphone,
  Menu,
  X,
  Landmark,
  FileCheck,
  Lock,
  Star,
} from "lucide-react";

const navLinks = [
  { href: "#personal", label: "Personal" },
  { href: "#business", label: "Negocios" },
  { href: "#pricing", label: "Precios" },
  { href: "#faq", label: "FAQ" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16">
        <Logo href="/" />

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Empezar gratis</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <div className="flex flex-col gap-6 py-6">
              <div className="flex items-center justify-between">
                <Logo href="/" />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Cerrar menú">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col gap-4 text-base font-medium">
                {navLinks.map((link) => (
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
                  <span className="text-sm text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                <Button variant="outline" asChild>
                  <Link href="/sign-in">Iniciar sesión</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">Empezar gratis</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function Hero() {
  const trustItems = [
    { icon: ShieldCheck, label: "Seguro" },
    { icon: Landmark, label: "Respaldado por bancos Colombianos" },
    { icon: FileCheck, label: "Compatible DIAN" },
    { icon: Lock, label: "Encriptado 256-bit" },
  ];

  return (
    <section className="relative overflow-hidden px-4 pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-5xl text-center">
        <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          Hecho para Colombia — compatible con DIAN
        </Badge>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Tu dinero, tu reglas, <br className="hidden md:block" />
          <span className="text-primary">tu crecimiento</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Rhynode une finanzas personales y herramientas de negocio en una sola app.
          Controla gastos, ahorra con inteligencia, factura electrónicamente y cumple tus impuestos.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="group w-full gap-2 sm:w-auto" asChild>
            <Link href="/sign-up">
              <Zap className="h-4 w-4" />
              Probar gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Sin tarjeta de crédito. Configura tu cuenta en menos de 2 minutos.
        </p>
      </div>
    </section>
  );
}

function TrustBadges() {
  const items = [
    "Encriptación de datos",
    "Cumplimiento DIAN",
    "Soporte en español",
    "App móvil PWA",
  ];

  return (
    <section className="border-y border-border/50 bg-muted/30 px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "+10.000", label: "usuarios activos" },
    { value: "$50MM+", label: "gestionados" },
    { value: "4.9/5", label: "rating app" },
    { value: "99.9%", label: "uptime" },
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
  const banks = ["Bancolombia", "Davivienda", "Nu", "Nequi", "PSE", "Wompi"];

  return (
    <section className="border-y border-border/50 bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Conecta con tus bancos y pasarelas
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

function PersonalSection() {
  const features = [
    {
      icon: Wallet,
      title: "Presupuestos inteligentes",
      description: "Crea presupuestos por categoría y recibe alertas cuando te acerques a tus límites.",
    },
    {
      icon: PiggyBank,
      title: "Metas de ahorro",
      description: "Visualiza tu progreso y automatiza ahorros periódicos sin esfuerzo.",
    },
    {
      icon: Receipt,
      title: "Seguimiento de gastos",
      description: "Categorización automática con IA. Entiende exactamente a dónde va tu dinero.",
    },
    {
      icon: TrendingUp,
      title: "Patrimonio e inversiones",
      description: "Conecta cuentas bancarias y sigue tu patrimonio en tiempo real.",
    },
  ];

  return (
    <section id="personal" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Finanzas personales que funcionan
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Diseñado para personas que quieren tomar el control de su dinero sin complicaciones.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="border-border/50 bg-card transition hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BusinessSection() {
  const features = [
    {
      icon: FileText,
      title: "Facturación electrónica DIAN",
      description: "Emite facturas electrónicas válidas, envíalas automáticamente y controla pagos.",
    },
    {
      icon: Briefcase,
      title: "Cuentas por cobrar",
      description: "Gestiona clientes, contratos y cobros. Reduce morosidad con recordatorios automáticos.",
    },
    {
      icon: Calculator,
      title: "Impuestos y reportes",
      description: "Genera reportes fiscales pre-llenados y cumple con tus obligaciones tributarias.",
    },
    {
      icon: ShieldCheck,
      title: "Seguridad empresarial",
      description: "Control de acceso por roles, auditoría de movimientos y respaldo en la nube.",
    },
  ];

  return (
    <section id="business" className="bg-muted/30 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Operaciones financieras para tu negocio
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Todo lo que necesitas para facturar, cobrar y reportar sin salir de la app.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="border-border/50 bg-card transition hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
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
  const steps = [
    { number: "01", title: "Crea tu cuenta", description: "Regístrate gratis en menos de 2 minutos desde web o móvil." },
    { number: "02", title: "Conecta tu información", description: "Agrega cuentas, tarjetas y datos fiscales. Todo encriptado." },
    { number: "03", title: "Toma decisiones", description: "Usa alertas, reportes e IA para ahorrar más y crecer tu negocio." },
  ];

  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:mb-14 md:text-4xl">
          Empieza en minutos
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative rounded-2xl border border-border/50 bg-card p-6">
              <span className="text-3xl font-bold text-primary">{step.number}</span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: "María Fernanda López",
      role: "Freelancer de diseño",
      quote: "Antes no sabía a dónde se iba mi plata. Ahora tengo mis gastos categorizados y mis impuestos organizados en un solo lugar.",
      rating: 5,
    },
    {
      name: "Carlos Andrés Ramírez",
      role: "Dueño de tienda online",
      quote: "La facturación electrónica me ahorra horas cada mes. Mis clientes reciben las facturas automáticamente y la DIAN queda contenta.",
      rating: 5,
    },
    {
      name: "Daniela Torres",
      role: "Contadora independiente",
      quote: "Recomiendo Rhynode a mis clientes porque une contabilidad y finanzas personales sin que necesiten ser expertos en tecnología.",
      rating: 5,
    },
  ];

  return (
    <section className="bg-muted/30 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:mb-14 md:text-4xl">
          Lo que dicen nuestros usuarios
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-1 text-[var(--warning)]">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </p>
                <div className="mt-5">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Personal",
      price: "Gratis",
      description: "Para quienes quieren controlar su dinero.",
      features: [
        "Presupuestos y metas",
        "Seguimiento de gastos",
        "Hasta 2 cuentas bancarias",
        "Reportes mensuales",
        "App móvil PWA",
      ],
      cta: "Empezar gratis",
      href: "/sign-up",
      featured: false,
    },
    {
      name: "Pro",
      price: "$19.900",
      period: "/mes",
      description: "Finanzas personales con IA.",
      features: [
        "Todo lo del plan Personal",
        "Categorización con IA",
        "Metas avanzadas y escenarios",
        "Cuentas ilimitadas",
        "Alertas inteligentes",
      ],
      cta: "Unirse a la lista",
      href: "/sign-up?plan=pro",
      featured: true,
      badge: "Próximamente",
    },
    {
      name: "Scale",
      price: "$79.900",
      period: "/mes",
      description: "Facturación electrónica, impuestos y cobros para pymes.",
      features: [
        "Todo lo del plan Pro",
        "Facturación electrónica DIAN",
        "100 facturas/mes",
        "3 usuarios",
        "Clientes ilimitados",
        "Soporte prioritario",
      ],
      cta: "Elegir Scale",
      href: "/sign-up?plan=scale",
      featured: false,
      checkoutPlan: "SCALE" as const,
    },
  ];

  return <PricingCards plans={plans} />;
}

function Faq() {
  const items = [
    {
      question: "¿Rhynode reemplaza a mi contador?",
      answer:
        "No. Rhynode automatiza tareas repetitivas y organiza tu información para que tú o tu contador trabajen más rápido y con menos errores.",
    },
    {
      question: "¿La facturación es válida ante la DIAN?",
      answer:
        "Sí. Generamos facturas electrónicas con la estructura requerida por la DIAN y preparamos la integración con proveedores de facturación autorizados.",
    },
    {
      question: "¿Puedo usarlo solo para finanzas personales?",
      answer:
        "Por supuesto. El plan Personal es gratis para siempre y puedes usarlo sin activar funciones de negocio.",
    },
    {
      question: "¿Mis datos financieros están seguros?",
      answer:
        "Utilizamos encriptación en tránsito y en reposo, autenticación segura y nunca vendemos tu información.",
    },
    {
      question: "¿Cuánto cuesta y hay contratos de permanencia?",
      answer:
        "El plan Personal es gratis. Los planes Pro y Scale son mensuales sin contratos de permanencia ni cargos ocultos. Cancela cuando quieras.",
    },
    {
      question: "¿Quién es propietario de mis datos?",
      answer:
        "Tú. Tus datos financieros te pertenecen. Puedes exportarlos o solicitar su eliminación en cualquier momento desde tu cuenta.",
    },
  ];

  return (
    <section id="faq" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:mb-14 md:text-4xl">
          Preguntas frecuentes
        </h2>

        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.question} className="border-border/50 bg-card">
              <CardContent className="p-5">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-primary/20 to-accent/30 p-8 text-center md:p-12">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Listo para tomar el control de tus finanzas?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Únete a miles de personas y negocios en Colombia que usan Rhynode para crecer con confianza.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/sign-up">
              <Smartphone className="h-4 w-4" />
              Crear cuenta gratis
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Rhynode</span>
        </div>
        <p className="text-center text-sm text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Rhynode. Hecho en Colombia.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terms" className="hover:text-foreground">Términos</Link>
          <Link href="/support" className="hover:text-foreground">Soporte</Link>
        </div>
      </div>
    </footer>
  );
}

function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/95 p-4 backdrop-blur-md md:hidden">
      <Button size="lg" className="w-full" asChild>
        <Link href="/sign-up">Empezar gratis</Link>
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
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pb-20 md:pb-0">
      <LandingSchema />
      <Navbar />
      <Hero />
      <TrustBadges />
      <StatsSection />
      <BanksStrip />
      <PersonalSection />
      <BusinessSection />
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
