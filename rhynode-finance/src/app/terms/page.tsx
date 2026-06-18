import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = buildMetadata({
  title: "Términos y condiciones de servicio",
  description:
    "Términos y condiciones de uso de Rhynode para personas y empresas en Colombia, incluyendo jurisdicción, limitación de responsabilidad y condiciones de facturación.",
  path: "/terms",
  keywords: ["términos de servicio", "condiciones de uso", "fintech Colombia", "jurisdicción"],
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
          Términos y condiciones de servicio
        </h1>

        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
            <Section title="1. Las partes">
              <p>
                Rhynode es operado por <strong>[Razón social del responsable — completar]</strong>,
                NIT <strong>[NIT — completar]</strong>, domiciliado en Colombia (en adelante,
                «Rhynode»). Al registrarte y usar la plataforma, celebras un contrato con
                Rhynode en tu condición de «Usuario».
              </p>
            </Section>

            <Section title="2. Objeto del servicio">
              <p>
                Rhynode es una plataforma de gestión financiera personal y empresarial que
                ofrece: registro de cuentas, transacciones, presupuestos, metas, deudas,
                suscripciones, facturación a clientes, estimación tributaria (incluida una
                declaración de renta estimada), proyecciones de flujo de caja, escenarios,
                un asesor conversacional con IA y reportes. El servicio es una herramienta
                de organización y estimación, no constituye asesoría contable, fiscal,
                tributaria, jurídica ni de inversión.
              </p>
            </Section>

            <Section title="3. Aceptación de los términos">
              <p>
                Al usar Rhynode aceptas estos términos. Si no estás de acuerdo, no uses la
                plataforma. El uso del servicio después de modificaciones publicadas implica
                la aceptación de la versión vigente.
              </p>
            </Section>

            <Section title="4. Requisitos y capacidad">
              <p>
                El servicio está dirigido a personas mayores de edad y a empresas legalmente
                constituidas en Colombia. El Usuario declara que tiene capacidad legal para
                obligarse y que la información que proporciona es veraz.
              </p>
            </Section>

            <Section title="5. Cuentas, credenciales y seguridad">
              <p>
                Eres responsable de la confidencialidad de tus credenciales y de toda
                actividad bajo tu cuenta. Debes notificar de inmediato cualquier uso no
                autorizado a soporte@rhynode.finance. Rhynode podrá suspender cuentas ante
                indicios de uso indebido.
              </p>
            </Section>

            <Section title="6. Uso permitido y prohibido">
              <p>
                Puedes usar Rhynode para gestionar tus finanzas y las de tu empresa. Queda
                prohibido usar la plataforma para actividades ilícitas, fraudulentas, que
                violen derechos de terceros, para lavar activos, financiar el terrorismo o
                evadir obligaciones tributarias, conforme a la legislación colombiana.
              </p>
            </Section>

            <Section title="7. Planes, precios y facturación">
              <p>
                Algunos planes son de pago. Los cobros se procesan mediante Stripe en la
                periodicidad del plan seleccionado. Los precios pueden actualizarse con
                preaviso. Puedes cancelar tu suscripción desde la configuración de la cuenta;
                la cancelación surtirá efecto al fin del período ya pagado. El reembolso, si
                aplica, se rige por la política de Stripe y la ley colombiana de protección
                al consumidor (Ley 1480 de 2011).
              </p>
            </Section>

            <Section title="8. Contenido del usuario">
              <p>
                Eres titular de la información que ingresas. Concedes a Rhynode una licencia
                no exclusiva para procesar tus datos exclusivamente con la finalidad descrita
                en la Política de Privacidad. Puedes exportar tus datos en cualquier momento
                desde la plataforma.
              </p>
            </Section>

            <Section title="9. Inteligencia artificial — limitaciones">
              <p>
                Las funciones de IA (asesor conversacional, OCR de recibos, categorización,
                resumen diario, estimación de renta) pueden cometer errores y no sustituyen
                criterio profesional. La categorización y las estimaciones tributarias son
                orientativas. Es tu responsabilidad revisar y validar la información antes de
                tomar decisiones o presentar declaraciones. Las consultas comunes del asesor
                se resuelven sin invocar un modelo externo; las abiertas pueden enviarse a un
                proveedor de IA conforme a la Política de Privacidad.
              </p>
            </Section>

            <Section title="10. Propiedad intelectual">
              <p>
                Los derechos sobre la plataforma, su diseño y código pertenecen a Rhynode. El
                contenido que tú ingresas sigue siendo de tu titularidad conforme a la
                sección 8.
              </p>
            </Section>

            <Section title="11. Limitación de responsabilidad">
              <p>
                Rhynode se proporciona «tal cual» y en la medida permitida por la ley
                colombiana. En ningún caso Rhynode responde por daños indirectos, lucro
                cesante o decisiones tomadas con base en estimaciones de la plataforma. La
                responsabilidad de Rhynode se limita, en todo caso, al monto pagado por el
                Usuario en los doce (12) meses anteriores. Nada de lo aquí dispuesto excluye
                derechos irrenunciables del consumidor (Ley 1480 de 2011).
              </p>
            </Section>

            <Section title="12. Suspensión y terminación">
              <p>
                Rhynode podrá suspender o terminar cuentas que infrinjan estos términos. El
                Usuario puede cerrar su cuenta en cualquier momento, lo que dará lugar a la
                supresión de sus datos conforme a la Política de Privacidad y a la ley.
              </p>
            </Section>

            <Section title="13. Caso fortuito y fuerza mayor">
              <p>
                Ninguna parte responde por incumplimientos derivados de eventos de caso
                fortuito o fuerza mayor conforme al artículo 64 del Código Civil colombiano.
              </p>
            </Section>

            <Section title="14. Ley aplicable y jurisdicción">
              <p>
                Estos términos se rigen por las leyes de la República de Colombia. Para
                cualquier controversia, las partes se someten a la jurisdicción de los jueces
                del domicilio del Usuario en Colombia, o, tratándose de consumidores, a la
                competente conforme a la Ley 1480 de 2011.
              </p>
            </Section>

            <Section title="15. Modificaciones">
              <p>
                Podemos modificar estos términos. Los cambios entrarán en vigor al publicarse
                en esta página; el uso continuado implica aceptación de la versión vigente.
              </p>
            </Section>

            <Section title="16. Contacto">
              <p>
                Para cualquier inquietud sobre estos términos, escribe a{" "}
                <a className="text-foreground underline" href="mailto:soporte@rhynode.finance">
                  soporte@rhynode.finance
                </a>
                .
              </p>
            </Section>

            <p className="pt-4 text-xs text-muted-foreground">
              Última actualización: junio de 2026. Documento alineado a la normativa colombiana;
              los campos marcados como «completar» deben ser diligenciados por el operador antes
              de su uso definitivo en producción. Revisión final por abogado recomendada.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}