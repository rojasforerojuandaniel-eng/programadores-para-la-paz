import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = buildMetadata({
  title: "Política de privacidad",
  description:
    "Conoce cómo Rhynode recopila, usa y protege tu información financiera personal y empresarial en Colombia.",
  path: "/privacy",
  keywords: ["privacidad", "protección de datos", "finanzas Colombia", "seguridad"],
});

export default function PrivacyPage() {
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
          Política de privacidad
        </h1>

        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                1. Información que recopilamos
              </h2>
              <p>
                Recopilamos la información que nos proporcionas al crear tu cuenta,
                configurar tu perfil, registrar transacciones, facturas, clientes y
                usar nuestros servicios de inteligencia artificial. Esto incluye datos
                de contacto, información fiscal y financiera, y preferencias de uso.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                2. Cómo usamos tu información
              </h2>
              <p>
                Usamos tu información para operar la plataforma, generar reportes,
                enviar alertas, mejorar nuestros modelos de IA internos y cumplir con
                obligaciones legales en Colombia. Nunca vendemos tu información a
                terceros.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                3. Seguridad
              </h2>
              <p>
                Aplicamos encriptación en tránsito y en reposo, autenticación segura
                mediante Clerk, control de acceso basado en roles y auditoría de
                eventos. Solo el personal autorizado puede acceder a sistemas de
                producción.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                4. Tus derechos
              </h2>
              <p>
                Puedes acceder, corregir o eliminar tu información contactándonos en
                soporte@rhynode.finance. También puedes cancelar tu cuenta desde la
                configuración en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                5. Cambios a esta política
              </h2>
              <p>
                Podemos actualizar esta política ocasionalmente. Te notificaremos sobre
                cambios importantes mediante la aplicación o correo electrónico.
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
