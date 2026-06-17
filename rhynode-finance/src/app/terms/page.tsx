import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = buildMetadata({
  title: "Términos de servicio",
  description:
    "Lee los términos y condiciones de uso de Rhynode para personas y empresas en Colombia.",
  path: "/terms",
  keywords: ["términos de servicio", "condiciones de uso", "fintech Colombia"],
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo href="/" />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">
          Términos de servicio
        </h1>

        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                1. Aceptación de los términos
              </h2>
              <p>
                Al usar Rhynode, aceptas estos términos de servicio. Si no estás de
                acuerdo, no uses la plataforma. Rhynode está dirigida a personas
                mayores de edad y empresas legalmente constituidas en Colombia.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                2. Cuentas y seguridad
              </h2>
              <p>
                Eres responsable de mantener la confidencialidad de tus credenciales
                y de toda actividad que ocurra bajo tu cuenta. Notifícanos
                inmediatamente sobre cualquier uso no autorizado.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                3. Uso permitido
              </h2>
              <p>
                Puedes usar Rhynode para gestionar tus finanzas personales y
                empresariales, facturar clientes, calcular impuestos y recibir
                asesoría financiera. No puedes usar la plataforma para actividades
                ilegales, fraudulentas o que violen derechos de terceros.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                4. Facturación y suscripciones
              </h2>
              <p>
                Algunos planes de Rhynode son de pago. Los cargos se procesan a
                través de Stripe y se facturan según el plan seleccionado. Puedes
                cancelar tu suscripción desde la configuración de tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                5. Limitación de responsabilidad
              </h2>
              <p>
                Rhynode te ayuda a organizar tu información financiera, pero no
                reemplaza el asesoramiento contable, fiscal o legal profesional.
                Siempre consulta a un contador o abogado para decisiones importantes.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                6. Modificaciones
              </h2>
              <p>
                Podemos modificar estos términos en cualquier momento. Los cambios
                entrarán en vigor al publicarse en esta página.
              </p>
            </section>

            <p className="pt-4 text-xs text-muted-foreground">
              Última actualización: junio de 2026.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
