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
  Smartphone,
  Menu,
  X,
  Landmark,
  FileCheck,
  Lock,
  Star,
  ChevronDown,
  Users,
  BadgeCheck,
  Mail,
  ExternalLink,
  HelpCircle,
  Building2,
} from "lucide-react";

const navLinks = [
  { href: "#features", label: "Funciones" },
  { href: "#pricing", label: "Precios" },
  { href: "#testimonials", label: "Testimonios" },
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
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
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
          <SheetContent
            side="top"
            className="w-full border-b border-border/50 bg-background/95 backdrop-blur-md"
          >
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
    { icon: ShieldCheck, label: "Hecho para Colombia" },
    { icon: FileCheck, label: "Preparado para facturación DIAN" },
    { icon: Lock, label: "Encriptación de datos" },
    { icon: Landmark, label: "Conecta tus bancos colombianos" },
  ];

  return (
    <section className="relative overflow-hidden px-4 pt-24 pb-10 md:pt-32 md:pb-16">
      <div className="mx-auto max-w-5xl text-center">
        <Badge
          variant="secondary"
          className="mb-4 px-3 py-1 text-xs font-medium md:mb-6"
        >
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          App financiera #1 para personas y pymes en Colombia
        </Badge>

        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
          Ahorra más, cobra rápido y haz crecer tu patrimonio
          <span className="text-primary"> desde una sola app</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg md:mt-6">
          Rhynode organiza tus finanzas personales y empresariales en Colombia.
          Presupuestos con IA, facturación electrónica DIAN, pagos con Wompi y
          reportes fiscales que realmente entiendes.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:mt-8">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="group h-12 w-full gap-2 text-base sm:w-auto"
            asChild
          >
            <Link href="/sign-up">
              <Zap className="h-4 w-4" aria-hidden="true" />
              Probar gratis 14 días
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full text-base sm:w-auto"
            asChild
          >
            <Link href="#pricing">Ver planes y precios</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Sin tarjeta de crédito. Cancela cuando quieras. Configura tu cuenta en
          menos de 2 minutos.
        </p>
      </div>
    </section>
  );
}

function TrustBadges() {
  const items = [
    { icon: Lock, label: "Encriptación AES-256" },
    { icon: FileCheck, label: "Estructura DIAN lista" },
    { icon: BadgeCheck, label: "Wompi y PSE integrados" },
    { icon: Smartphone, label: "App PWA sin instalar" },
    { icon: Users, label: "Soporte en español" },
    { icon: ShieldCheck, label: "No vendemos tus datos" },
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
          Conecta con tus bancos y pasarelas de Colombia
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
  const features = [
    {
      icon: Wallet,
      title: "Presupuestos inteligentes",
      description:
        "Crea presupuestos por categoría y recibe alertas antes de pasarte.",
      audience: "Personal",
    },
    {
      icon: PiggyBank,
      title: "Metas de ahorro con propósito",
      description:
        "Visualiza tu progreso y automatiza ahorros periódicos sin esfuerzo.",
      audience: "Personal",
    },
    {
      icon: Receipt,
      title: "Gastos categorizados con IA",
      description:
        "Entiende exactamente a dónde va tu dinero sin clasificar manualmente.",
      audience: "Personal",
    },
    {
      icon: FileText,
      title: "Facturación electrónica DIAN",
      description:
        "Emite facturas válidas, envíalas automáticamente y controla pagos.",
      audience: "Negocio",
    },
    {
      icon: Briefcase,
      title: "Cuentas por cobrar",
      description:
        "Gestiona clientes y cobros. Reduce morosidad con recordatorios automáticos.",
      audience: "Negocio",
    },
    {
      icon: Calculator,
      title: "Impuestos y reportes fiscales",
      description:
        "Genera reportes pre-llenados y cumple con tus obligaciones ante la DIAN.",
      audience: "Negocio",
    },
  ];

  return (
    <section id="features" className="px-4 py-14 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <Badge variant="secondary" className="mb-3">
            Todo lo que necesitas
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Finanzas personales y de negocio, juntas
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Tanto si ahorras para tu próximo viaje como si facturas para
            clientes, Rhynode se adapta a ti.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="border-border/50 bg-card transition hover:border-primary/30 dark:border-border"
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge
                      variant={f.audience === "Negocio" ? "outline" : "secondary"}
                      className="text-xs"
                    >
                      {f.audience}
                    </Badge>
                  </div>
                  <h3 className="mb-1 font-semibold text-card-foreground">{f.title}</h3>
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
    {
      number: "01",
      title: "Crea tu cuenta",
      description:
        "Regístrate gratis en menos de 2 minutos desde web o móvil.",
    },
    {
      number: "02",
      title: "Conecta tu información",
      description:
        "Agrega cuentas, tarjetas y datos fiscales. Todo encriptado.",
    },
    {
      number: "03",
      title: "Toma decisiones",
      description:
        "Usa alertas, reportes e IA para ahorrar más y crecer tu negocio.",
    },
  ];

  return (
    <section className="bg-muted/30 px-4 py-14 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground md:mb-14 md:text-4xl">
          Empieza en minutos, no en días
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-2xl border border-border/50 bg-card p-6 dark:border-border"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
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
      quote:
        "Antes no sabía a dónde se iba mi plata. Ahora tengo mis gastos categorizados y mis impuestos organizados en un solo lugar.",
      rating: 5,
      initials: "MFL",
    },
    {
      name: "Carlos Andrés Ramírez",
      role: "Dueño de tienda online",
      quote:
        "La facturación electrónica me ahorra horas cada mes. Mis clientes reciben las facturas automáticamente y la DIAN queda contenta.",
      rating: 5,
      initials: "CAR",
    },
    {
      name: "Daniela Torres",
      role: "Contadora independiente",
      quote:
        "Recomiendo Rhynode a mis clientes porque une contabilidad y finanzas personales sin que necesiten ser expertos en tecnología.",
      rating: 5,
      initials: "DT",
    },
  ];

  return (
    <section id="testimonials" className="px-4 py-14 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Más de 10.000 personas y pymes en Colombia confían en Rhynode.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border/50 bg-card dark:border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-1 text-warning">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-current"
                      aria-hidden="true"
                    />
                  ))}
                  <span className="sr-only">{t.rating} de 5 estrellas</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-card-foreground">
                  “{t.quote}”
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar initials={t.initials} />
                  <div>
                    <p className="font-semibold text-card-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
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
      name: "Starter",
      price: "Gratis",
      description: "Para quienes quieren controlar su dinero personal.",
      features: [
        "Presupuestos y metas de ahorro",
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
      name: "Growth",
      price: "$19.900",
      period: "/mes",
      description: "Finanzas personales con IA y escenarios avanzados.",
      features: [
        "Todo lo del plan Starter",
        "Categorización con IA",
        "Metas avanzadas y simuladores",
        "Cuentas ilimitadas",
        "Alertas inteligentes",
      ],
      cta: "Unirse a la lista",
      href: "/sign-up?plan=growth",
      featured: true,
      badge: "Próximamente",
    },
    {
      name: "Scale",
      price: "$79.900",
      period: "/mes",
      description: "Facturación DIAN, cobros y equipo para pymes.",
      features: [
        "Todo lo del plan Growth",
        "Facturación electrónica DIAN",
        "100 facturas/mes",
        "3 usuarios incluidos",
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
      question: "¿Puedo pagar con Wompi, PSE o tarjeta?",
      answer:
        "Sí. Los planes pagos se procesan con Wompi, lo que te permite pagar con PSE, tarjetas de crédito/débito y otros medios disponibles en Colombia.",
    },
    {
      question: "¿Puedo usarlo solo para finanzas personales?",
      answer:
        "Por supuesto. El plan Starter es gratis para siempre y puedes usarlo sin activar funciones de negocio.",
    },
    {
      question: "¿Mis datos financieros están seguros?",
      answer:
        "Utilizamos encriptación en tránsito y en reposo, autenticación segura y nunca vendemos tu información. Tú eres dueño de tus datos.",
    },
    {
      question: "¿Cuánto cuesta y hay contratos de permanencia?",
      answer:
        "El plan Starter es gratis. Growth y Scale son mensuales sin contratos de permanencia ni cargos ocultos. Cancela cuando quieras.",
    },
    {
      question: "¿Funciona en móvil?",
      answer:
        "Sí. Rhynode es una PWA, así que puedes usarla desde el navegador de tu celular, agregarla a tu pantalla de inicio y recibir notificaciones.",
    },
    {
      question: "¿Cómo conecto mi banco?",
      answer:
        "Puedes registrar movimientos manualmente o conectar cuentas de Bancolombia, Davivienda, Nu, Nequi y otras entidades compatibles con PSE/Wompi.",
    },
  ];

  return (
    <section id="faq" className="bg-muted/30 px-4 py-14 md:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Preguntas frecuentes
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Respuestas claras sobre DIAN, seguridad, pagos y planes en Colombia.
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-border/50 bg-card dark:border-border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-semibold text-card-foreground transition-colors hover:bg-muted focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                {item.question}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="px-4 py-14 md:py-24">
      <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-primary/20 to-accent/30 p-8 text-center md:p-12 dark:from-primary/40 dark:to-accent/50">
        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Listo para tomar el control de tus finanzas?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Únete a miles de personas y negocios en Colombia que usan Rhynode
          para crecer con confianza.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-12 w-full gap-2 text-base sm:w-auto" asChild>
            <Link href="/sign-up">
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              Crear cuenta gratis
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full text-base sm:w-auto"
            asChild
          >
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = {
    Producto: [
      { label: "Funciones", href: "#features" },
      { label: "Precios", href: "#pricing" },
      { label: "Testimonios", href: "#testimonials" },
      { label: "FAQ", href: "#faq" },
    ],
    Legal: [
      { label: "Privacidad", href: "/privacy" },
      { label: "Términos", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
    Soporte: [
      { label: "Centro de ayuda", href: "/support" },
      { label: "Contacto", href: "/support" },
      { label: "Status", href: "https://status.rhynode.finance", external: true },
    ],
    Redes: [
      { label: "Twitter / X", href: "https://twitter.com/rhynode", external: true },
      { label: "LinkedIn", href: "https://linkedin.com/company/rhynode", external: true },
      { label: "Instagram", href: "https://instagram.com/rhynode", external: true },
    ],
  };

  return (
    <footer className="border-t border-border/50 bg-background px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold text-foreground">Rhynode</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Finanzas personales e inteligencia contable para personas y pymes
              en Colombia.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://twitter.com/rhynode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Twitter"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="mailto:hola@rhynode.finance"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Correo electrónico"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://linkedin.com/company/rhynode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="LinkedIn"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {link.label}
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
            © {new Date().getFullYear()} Rhynode. Hecho en Colombia.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>¿Dudas? Escríbenos a hola@rhynode.finance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/95 p-4 backdrop-blur-md md:hidden">
      <Button size="lg" className="h-12 w-full text-base" asChild>
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
      className="min-h-screen bg-background pb-20 md:pb-0"
    >
      <LandingSchema />
      <Navbar />
      <Hero />
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
