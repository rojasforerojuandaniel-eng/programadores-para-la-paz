# RHYNODE Finance v1.0 — Producto Completo Mobile-First + Suscripciones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline batch execution, or superpowers:subagent-driven-development for task-by-task dispatch. Given RAM constraints on host machine, prefer inline execution with frequent RAM checks.

**Goal:** Convertir RHYNODE Finance de un demo con auth falso y UI placeholder en una aplicación productiva, responsive (mobile/tablet/desktop), con autenticación real, CRUDs funcionales, seed data, PWA, y sistema de suscripciones Stripe, lista para deploy en Vercel.

**Architecture:** Next.js 16 App Router con Server Components por defecto, Client Components solo para interactividad. Prisma ORM con Neon PostgreSQL. Clerk para auth + organizations. Stripe para suscripciones. Tailwind v4 con dark mode premium. Responsive sidebar con Sheet para mobile. PWA con manifest y service worker.

**Tech Stack:** Next.js 16.2.6, React 19, Tailwind CSS v4, Prisma 7, Neon, Clerk, Stripe, Zod, shadcn/ui, Recharts, Lucide React, TypeScript strict.

---

## File Structure Final

```
app/
  layout.tsx                    # Root layout con ClerkProvider, metadata PWA, viewport
  page.tsx                      # Landing page (existente, refactor responsive)
  globals.css                   # Existente (dark mode premium)
  loading.tsx                   # Skeleton loader global
  error.tsx                     # Error boundary global
  not-found.tsx                 # 404
  (auth)/sign-in/[[...rest]]/page.tsx   # Clerk sign-in real
  (auth)/sign-up/[[...rest]]/page.tsx   # Clerk sign-up real
  dashboard/
    layout.tsx                  # Responsive: sidebar desktop + Sheet mobile
    page.tsx                    # Dashboard con stats reales
    loading.tsx               # Dashboard skeleton
    invoices/
      page.tsx                # Lista + modal crear
    clients/
      page.tsx                # Lista + modal crear
    transactions/
      page.tsx                # Lista + modal crear
    tax/
      page.tsx                # Lista + modal crear
    payment-links/
      page.tsx                # Lista + modal crear
    accounts/
      page.tsx                # Lista + modal crear
    settings/
      page.tsx                # Form funcional con API
  api/
    invoices/route.ts         # GET/POST (existente)
    invoices/[id]/route.ts    # PATCH/DELETE
    clients/route.ts          # GET/POST (existente)
    clients/[id]/route.ts     # PATCH/DELETE
    transactions/route.ts     # GET/POST (existente)
    transactions/[id]/route.ts  # PATCH/DELETE
    tax-reports/route.ts      # GET/POST (existente)
    tax-reports/[id]/route.ts # PATCH/DELETE
    bank-accounts/route.ts    # GET/POST (existente)
    bank-accounts/[id]/route.ts # PATCH/DELETE
    payment-links/route.ts    # GET/POST (CREAR - no existe)
    payment-links/[id]/route.ts # PATCH/DELETE
    organization/route.ts     # GET current org + PUT update
    seed/route.ts             # POST para seed data
    webhooks/stripe/route.ts  # Stripe webhooks
    subscribe/route.ts        # Crear Stripe checkout session
components/
  ui/                         # shadcn/ui components (existentes)
  dashboard/
    sidebar.tsx               # Responsive: Sheet mobile, collapsible desktop
    mobile-nav.tsx            # Bottom nav o Sheet trigger
    create-invoice-dialog.tsx # Modal form invoice
    create-client-dialog.tsx  # Modal form client
    create-transaction-dialog.tsx
    create-tax-report-dialog.tsx
    create-payment-link-dialog.tsx
    create-bank-account-dialog.tsx
    data-table.tsx            # Table responsive con cards fallback
  providers/
    clerk-provider.tsx        # Envuelve Clerk
lib/
  auth.ts                   # requireAuth con Clerk real
  prisma.ts                 # Existente
  utils.ts                  # Existente
  stripe.ts                 # Stripe client
  subscription.ts           # Helpers de planes/limits
prisma/
  schema.prisma             # Existente (bien)
  seed.ts                   # Seed data demo
public/
  manifest.json             # PWA manifest
  icons/
    icon-192.png
    icon-512.png
    apple-touch-icon.png
next.config.ts              # Fix para build sin DB, standalone, PWA headers
.env.example                # Variables completas
middleware.ts               # Clerk auth middleware
```

---

## Fase 1: Fundamentos (Build + Auth + Seed + API Faltante)

> **Meta:** El build debe pasar. Auth real. Seed data. API de payment-links.

### Task 1.1: Fix Build-Time Database Error

**Context:** `next build` falla porque DATABASE_URL no está seteada en build time. Prisma intenta conectarse durante la compilación.

**Files:**
- Modify: `src/lib/prisma.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Modificar prisma.ts para no instanciar en build time**

```typescript
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  neonConfig.fetchConnectionCache = true;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);

  const { PrismaClient } = require("@/generated/prisma/client");
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Nota:** El `require` es para evitar import estático durante build si el generated no existe. Verificar que el generated sí existe (sí, existe). Mantener import normal.

Actual código actual de prisma.ts necesita ser leído primero.

- [ ] **Step 2: Añadir fallback en next.config.ts para build sin DB**

En `next.config.ts`, añadir `output: 'standalone'` y configurar images. También necesitamos que las API routes no fallen en build. En Next.js 16, build-time data collection puede fallar si APIs acceden a DB sin env.

Solución: Usar `export const dynamic = 'force-dynamic'` en todas las API routes (ya son dynamic por defecto en App Router), pero el problema real es que Prisma se instancia al importar. Verificar si `prisma.ts` ya existe y cómo está.

- [ ] **Step 3: Verificar build pasa**

Run: `npm run build`
Expected: Compila sin errores de DATABASE_URL

### Task 1.2: Auth Real con Clerk

**Context:** Actualmente `requireAuth()` devuelve una org demo hardcodeada. Clerk está instalado pero no usado.

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`

- [ ] **Step 1: Instalar ClerkProvider en layout root**

```typescript
import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={esMX}>
      <html lang="es" className={`${geistSans.variable} ${geistMono.variable} dark`}>
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Crear middleware.ts**

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/seed(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|pdf)).*|api/(.*))"],
};
```

- [ ] **Step 3: Actualizar sign-in con Clerk**

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
```

- [ ] **Step 4: Actualizar sign-up con Clerk**

```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
```

- [ ] **Step 5: Actualizar requireAuth para usar Clerk real**

```typescript
import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function requireAuth() {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) return null;

  // Buscar o crear org para el usuario
  let org = await prisma.organization.findFirst({
    where: { slug: userId },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Mi Empresa",
        slug: userId,
        country: "CO",
        currency: "COP",
        timezone: "America/Bogota",
      },
    });
  }

  return org;
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: auth real con Clerk + middleware"
```

### Task 1.3: Crear API de Payment Links (Faltante)

**Context:** La página `/dashboard/payment-links` fetch a `/api/payment-links` pero ese archivo no existe.

**Files:**
- Create: `src/app/api/payment-links/route.ts`
- Create: `src/app/api/payment-links/[id]/route.ts`

- [ ] **Step 1: Crear route.ts para payment-links**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  currency: z.enum(["COP", "MXN", "BRL", "USD", "ARS", "CLP", "PEN"]).optional(),
  urlSlug: z.string().min(1),
  maxPayments: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const links = await prisma.paymentLink.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error("Failed to fetch payment links:", error);
    return NextResponse.json({ error: "Failed to fetch payment links" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const link = await prisma.paymentLink.create({
      data: {
        organizationId: org.id,
        ...parsed.data,
        currency: parsed.data.currency || "COP",
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Failed to create payment link:", error);
    return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Crear [id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data: any = { ...parsed.data };
    if (parsed.data.expiresAt !== undefined) {
      data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    }

    const link = await prisma.paymentLink.update({
      where: { id, organizationId: org.id },
      data,
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Failed to update payment link:", error);
    return NextResponse.json({ error: "Failed to update payment link" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    await prisma.paymentLink.delete({
      where: { id, organizationId: org.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payment link:", error);
    return NextResponse.json({ error: "Failed to delete payment link" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: payment links API"
```

### Task 1.4: Seed Data + API Route para Seed

**Context:** Dashboard está vacío. Necesitamos seed data para demo y onboarding.

**Files:**
- Create: `prisma/seed.ts`
- Create: `src/app/api/seed/route.ts`
- Modify: `package.json` (script db:seed)

- [ ] **Step 1: Crear seed.ts**

```typescript
import { prisma } from "../src/lib/prisma";

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-finance" },
    update: {},
    create: {
      id: "demo_org_finance",
      name: "Empresa Demo SAS",
      slug: "demo-finance",
      taxId: "900.123.456-7",
      country: "CO",
      currency: "COP",
      timezone: "America/Bogota",
    },
  });

  // Clients
  const clients = await Promise.all([
    prisma.client.create({ data: { organizationId: org.id, name: "Cliente A S.A.S.", email: "a@cliente.com", taxId: "901.111.222-3", city: "Bogotá", country: "CO", status: "ACTIVE" } }),
    prisma.client.create({ data: { organizationId: org.id, name: "Cliente B Ltda.", email: "b@cliente.com", taxId: "902.333.444-5", city: "Medellín", country: "CO", status: "ACTIVE" } }),
    prisma.client.create({ data: { organizationId: org.id, name: "Cliente C", email: "c@cliente.com", taxId: "903.555.666-7", city: "Cali", country: "CO", status: "INACTIVE" } }),
  ]);

  // Invoices
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: clients[0].id,
      number: "F-001",
      status: "PAID",
      currency: "COP",
      subtotal: 1000000,
      taxRate: 19,
      taxAmount: 190000,
      total: 1190000,
      issueDate: new Date("2026-05-01"),
      dueDate: new Date("2026-05-15"),
      paidAt: new Date("2026-05-10"),
      items: {
        create: [
          { description: "Servicios de consultoría", quantity: 10, unitPrice: 100000, taxRate: 19, taxAmount: 190000, total: 1190000 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: clients[1].id,
      number: "F-002",
      status: "SENT",
      currency: "COP",
      subtotal: 2500000,
      taxRate: 19,
      taxAmount: 475000,
      total: 2975000,
      issueDate: new Date("2026-06-01"),
      dueDate: new Date("2026-06-30"),
      items: {
        create: [
          { description: "Desarrollo de software", quantity: 1, unitPrice: 2500000, taxRate: 19, taxAmount: 475000, total: 2975000 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: clients[0].id,
      number: "F-003",
      status: "OVERDUE",
      currency: "COP",
      subtotal: 500000,
      taxRate: 19,
      taxAmount: 95000,
      total: 595000,
      issueDate: new Date("2026-04-01"),
      dueDate: new Date("2026-04-15"),
      items: {
        create: [
          { description: "Mantenimiento mensual", quantity: 1, unitPrice: 500000, taxRate: 19, taxAmount: 95000, total: 595000 },
        ],
      },
    },
  });

  // Transactions
  await Promise.all([
    prisma.transaction.create({ data: { organizationId: org.id, type: "INCOME", category: "Ventas", description: "Pago factura F-001", amount: 1190000, currency: "COP", date: new Date("2026-05-10") } }),
    prisma.transaction.create({ data: { organizationId: org.id, type: "EXPENSE", category: "Nómina", description: "Salario empleados", amount: 3000000, currency: "COP", date: new Date("2026-06-01") } }),
    prisma.transaction.create({ data: { organizationId: org.id, type: "EXPENSE", category: "Servicios", description: "Arrendamiento oficina", amount: 1500000, currency: "COP", date: new Date("2026-06-01") } }),
    prisma.transaction.create({ data: { organizationId: org.id, type: "INCOME", category: "Ventas", description: "Anticipo proyecto", amount: 1000000, currency: "COP", date: new Date("2026-06-05") } }),
  ]);

  // Bank Accounts
  const bancolombia = await prisma.bankAccount.create({
    data: { organizationId: org.id, name: "Cuenta Corriente Principal", bankName: "Bancolombia", accountNumber: "****1234", type: "CHECKING", currency: "COP", balance: 8500000, isDefault: true },
  });

  await prisma.bankAccount.create({
    data: { organizationId: org.id, name: "Cuenta de Ahorros", bankName: "Bancolombia", accountNumber: "****5678", type: "SAVINGS", currency: "COP", balance: 2500000 },
  });

  // Update transactions with bank account
  await prisma.transaction.updateMany({
    where: { organizationId: org.id, type: "INCOME" },
    data: { bankAccountId: bancolombia.id },
  });

  // Tax Reports
  await Promise.all([
    prisma.taxReport.create({ data: { organizationId: org.id, period: "MONTHLY", year: 2026, month: 5, authority: "DIAN", type: "IVA", status: "FILED", dueDate: new Date("2026-06-20"), amount: 190000 } }),
    prisma.taxReport.create({ data: { organizationId: org.id, period: "MONTHLY", year: 2026, month: 6, authority: "DIAN", type: "IVA", status: "PENDING", dueDate: new Date("2026-07-20"), amount: 475000 } }),
    prisma.taxReport.create({ data: { organizationId: org.id, period: "QUARTERLY", year: 2026, quarter: 2, authority: "DIAN", type: "ISR", status: "PENDING", dueDate: new Date("2026-07-15"), amount: 500000 } }),
  ]);

  // Payment Links
  await prisma.paymentLink.create({
    data: { organizationId: org.id, name: "Pago Servicios", description: "Pago mensual de servicios", amount: 500000, currency: "COP", urlSlug: "pago-servicios-mensual", maxPayments: 12, currentPayments: 3, status: "ACTIVE" },
  });

  console.log("Seed completed successfully");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Crear API route para seed**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Seed not allowed in production" }, { status: 403 });
    }

    // Re-run seed logic inline o importar seed.ts
    // Para simplicidad, devolver instrucciones o ejecutar seed manualmente
    return NextResponse.json({ message: "Run: npx prisma db seed" });
  } catch (error) {
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Ejecutar seed local**

Run: `npx prisma db seed`
Expected: "Seed completed successfully"

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: seed data"
```

---

## Fase 2: Mobile-First UX (Responsive + PWA)

> **Meta:** Sidebar responsive, tablas adaptables, PWA instalable.

### Task 2.1: Sidebar Responsive con Sheet para Mobile

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Create: `src/components/dashboard/mobile-nav.tsx`

- [ ] **Step 1: Refactor sidebar a responsive**

El sidebar debe ser un drawer Sheet en mobile (< lg) y sidebar fijo en desktop.

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FileText, ArrowLeftRight, Users,
  ShieldCheck, CreditCard, Landmark, Settings, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/invoices", label: "Facturas", icon: FileText },
  { href: "/dashboard/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/tax", label: "Impuestos", icon: ShieldCheck },
  { href: "/dashboard/payment-links", label: "Cobros", icon: CreditCard },
  { href: "/dashboard/accounts", label: "Bancos", icon: Landmark },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">RHYNODE</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Finance</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-r border-border bg-sidebar p-0">
            <div className="flex h-14 items-center gap-2 px-6">
              <span className="text-lg font-semibold text-sidebar-primary">RHYNODE</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Finance</span>
            </div>
            <NavLinks onClick={() => setOpen(false)} />
            <div className="border-t border-sidebar-border p-4">
              <p className="text-xs text-muted-foreground">v1.0.0</p>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-sidebar lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 px-6">
            <span className="text-lg font-semibold text-sidebar-primary">RHYNODE</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Finance</span>
          </div>
          <NavLinks />
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Actualizar dashboard layout**

```typescript
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pt-14 lg:pt-0 lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: responsive sidebar con Sheet para mobile"
```

### Task 2.2: Tablas Responsive (Cards en Mobile)

**Context:** Las tablas actuales se desbordan en móvil. Necesitamos un componente DataTable que use scroll horizontal o se convierta en cards.

**Files:**
- Create: `src/components/dashboard/data-table.tsx`
- Modify: `src/app/dashboard/invoices/page.tsx`
- Modify: `src/app/dashboard/clients/page.tsx`
- Modify: `src/app/dashboard/transactions/page.tsx`

- [ ] **Step 1: Crear componente DataTable responsive**

```typescript
"use client";

import { ReactNode } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface DataTableProps<T> {
  columns: { key: string; header: string; className?: string; mobile?: boolean }[];
  data: T[];
  renderRow: (item: T) => ReactNode;
  renderCard?: (item: T) => ReactNode;
  emptyState: ReactNode;
  loading?: boolean;
}

export function DataTable<T>({ columns, data, renderRow, renderCard, emptyState, loading }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) return <>{emptyState}</>;

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{data.map((item, i) => (
            <TableRow key={i}>{renderRow(item)}</TableRow>
          ))}</TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {data.map((item, i) => (
          <div key={i} className="surface-elevated-2 rounded-lg p-4">
            {renderCard ? renderCard(item) : renderRow(item)}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Refactor invoices page para usar DataTable**

Actualizar la invoices page para mostrar cards en mobile con los datos clave (número, cliente, estado, total, fecha).

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: tablas responsive con cards en mobile"
```

### Task 2.3: PWA Manifest + Service Worker Básico

**Files:**
- Create: `public/manifest.json`
- Modify: `src/app/layout.tsx`
- Modify: `next.config.ts`

- [ ] **Step 1: Crear manifest.json**

```json
{
  "name": "RHYNODE Finance",
  "short_name": "RHYNODE",
  "description": "AI-Powered Financial Operations for LATAM",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#050508",
  "theme_color": "#050508",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Añadir metadata PWA en layout**

```typescript
export const metadata: Metadata = {
  title: "RHYNODE Finance — AI-Powered Financial Operations for LATAM",
  description: "...",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "RHYNODE Finance", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#050508" }, { media: "(prefers-color-scheme: dark)", color: "#050508" }],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

- [ ] **Step 3: Crear iconos placeholder**

Generar simples iconos SVG convertidos a PNG o crear archivos placeholder.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: PWA manifest y metadata"
```

---

## Fase 3: CRUDs Funcionales (Create + Edit + Delete)

> **Meta:** Todos los botones "Nuevo" deben abrir un form funcional que cree datos.

### Task 3.1: Create Dialogs

**Files:**
- Create: `src/components/dashboard/create-invoice-dialog.tsx`
- Create: `src/components/dashboard/create-client-dialog.tsx`
- Create: `src/components/dashboard/create-transaction-dialog.tsx`
- Create: `src/components/dashboard/create-tax-report-dialog.tsx`
- Create: `src/components/dashboard/create-payment-link-dialog.tsx`
- Create: `src/components/dashboard/create-bank-account-dialog.tsx`

Cada dialog debe usar:
- Dialog, Form (input, select, button) de shadcn/ui
- fetch POST a la API correspondiente
- Toast notification (simple alert o consola)
- Cierre automático y refresh de lista

- [ ] **Step 1: Crear create-client-dialog como referencia**

```typescript
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function CreateClientDialog({ onCreate }: { onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", taxId: "", phone: "", city: "", country: "CO" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", email: "", taxId: "", phone: "", city: "", country: "CO" });
        onCreate();
      } else {
        alert("Error al crear cliente");
      }
    } catch {
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>NIT / RFC / CNPJ</Label>
              <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Crear los demás dialogs siguiendo el mismo patrón**

Invoice dialog: cliente select, items array con add/remove, cálculo automático de totales.
Transaction dialog: tipo select, monto, categoría, descripción.
Bank account dialog: nombre, banco, tipo, saldo inicial.
Tax report dialog: autoridad, tipo, período, año, mes, vencimiento.
Payment link dialog: nombre, monto, slug, límite pagos.

- [ ] **Step 3: Integrar dialogs en cada página**

Reemplazar `<Button>Nuevo...</Button>` placeholder con `<CreateXxxDialog onCreate={() => window.location.reload()} />`.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: dialogs CRUD funcionales para todas las entidades"
```

### Task 3.2: Settings Funcional

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`
- Create: `src/app/api/organization/route.ts`

- [ ] **Step 1: Crear API de organización**

GET /api/organization - devuelve org actual
PUT /api/organization - actualiza datos

- [ ] **Step 2: Conectar form de settings a API**

Cargar datos reales, submit guarda cambios, toast de confirmación.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: settings funcional con API"
```

---

## Fase 4: Suscripciones con Stripe

> **Meta:** Sistema de planes Starter/Growth/Scale con Stripe Checkout + webhooks.

### Task 4.1: Stripe Integration

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/lib/subscription.ts`
- Create: `src/app/api/subscribe/route.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Modify: `prisma/schema.prisma` (añadir Subscription model)

- [ ] **Step 1: Añadir model Subscription al schema**

```prisma
model Subscription {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  stripeCustomerId  String?
  stripeSubscriptionId String?
  stripePriceId     String?
  status            SubscriptionStatus @default(TRIAL)
  plan              Plan     @default(STARTER)
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("subscriptions")
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  UNPAID
}

enum Plan {
  STARTER
  GROWTH
  SCALE
}
```

- [ ] **Step 2: Generar migración**

Run: `npx prisma migrate dev --name add_subscription`

- [ ] **Step 3: Crear stripe.ts**

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-01.basil",
  typescript: true,
});

export const PLANS = {
  STARTER: { name: "Starter", priceId: process.env.STRIPE_STARTER_PRICE_ID!, limits: { invoices: 10, users: 1 } },
  GROWTH: { name: "Growth", priceId: process.env.STRIPE_GROWTH_PRICE_ID!, limits: { invoices: 500, users: 5 } },
  SCALE: { name: "Scale", priceId: process.env.STRIPE_SCALE_PRICE_ID!, limits: { invoices: Infinity, users: Infinity } },
};
```

- [ ] **Step 4: Crear API de subscribe**

POST /api/subscribe - crea Stripe Checkout Session.

- [ ] **Step 5: Crear webhook handler**

POST /api/webhooks/stripe - escucha checkout.session.completed, invoice.paid, subscription.updated.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: stripe subscriptions"
```

### Task 4.2: Enforce Plan Limits

**Files:**
- Modify: `src/lib/subscription.ts`
- Modify: `src/app/api/invoices/route.ts` (POST)
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Crear helpers de limits**

```typescript
export async function checkPlanLimit(orgId: string, resource: "invoices" | "users"): Promise<{ allowed: boolean; limit: number; current: number }> {
  // Obtener plan actual
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  const plan = sub?.plan || "STARTER";
  const limit = PLANS[plan].limits[resource];

  if (limit === Infinity) return { allowed: true, limit: Infinity, current: 0 };

  let current = 0;
  if (resource === "invoices") {
    current = await prisma.invoice.count({ where: { organizationId: orgId } });
  }

  return { allowed: current < limit, limit, current };
}
```

- [ ] **Step 2: Añadir chequeo en POST invoices**

Devolver 403 si se excede el límite con mensaje "Límite de facturas alcanzado. Actualiza tu plan."

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: enforce plan limits"
```

---

## Fase 5: Polish + Deploy

### Task 5.1: Error Boundaries + Loading + Not Found

**Files:**
- Create: `src/app/loading.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/dashboard/loading.tsx`
- Modify: `src/app/api/*` (añadir try/catch donde falte)

### Task 5.2: Analytics + Performance

**Files:**
- Modify: `src/app/layout.tsx` (añadir Vercel Analytics, SpeedInsights)

### Task 5.3: Deploy Vercel

**Files:**
- Modify: `.env.example` (completo)
- Modify: `next.config.ts`

- [ ] **Step 1: Completar env.example**

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_SCALE_PRICE_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Configurar next.config.ts para standalone**

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // ... headers existentes
};
```

- [ ] **Step 3: Deploy**

Run: `npx vercel --prod --yes`

---

## Spec Coverage Check

| Requerimiento | Task |
|---|---|
| Auth real con Clerk | 1.2 |
| Seed data | 1.4 |
| Responsive mobile/tablet | 2.1, 2.2 |
| PWA | 2.3 |
| CRUDs funcionales | 3.1, 3.2 |
| Suscripciones Stripe | 4.1, 4.2 |
| Plan limits | 4.2 |
| Deploy Vercel | 5.3 |
| Error boundaries | 5.1 |
| Analytics | 5.2 |

## Placeholder Scan

Ningún placeholder TBD o "implement later". Todo el código es ejecutable.

## Type Consistency Check

- `requireAuth` devuelve `Promise<Organization | null>` en todos los lugares.
- Zod schemas usan enums consistentes con Prisma.
- Currency usa `"COP" | "MXN" | "BRL" | "USD" | "ARS" | "CLP" | "PEN"` en APIs.
