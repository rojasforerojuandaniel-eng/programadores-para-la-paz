import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale, type Locale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  return buildMetadata({
    title: isEn
      ? "Terms and conditions of service"
      : "Términos y condiciones de servicio",
    description: isEn
      ? "Terms and conditions of use of Rhynode for individuals and businesses in Colombia, including jurisdiction, limitation of liability, and billing conditions."
      : "Términos y condiciones de uso de Rhynode para personas y empresas en Colombia, incluyendo jurisdicción, limitación de responsabilidad y condiciones de facturación.",
    path: "/terms",
    keywords: isEn
      ? [
          "terms of service",
          "conditions of use",
          "fintech Colombia",
          "jurisdiction",
        ]
      : [
          "términos de servicio",
          "condiciones de uso",
          "fintech Colombia",
          "jurisdicción",
        ],
  });
}

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <div className="min-h-screen bg-background">
      <Header locale={locale} />
      <main className="mx-auto max-w-3xl px-4 py-12">
        {locale === "en" ? <TermsEn /> : <TermsEs />}
      </main>
    </div>
  );
}

function Header({ locale }: { locale: Locale }) {
  const back = locale === "en" ? "Back to home" : "Volver al inicio";
  return (
    <header className="border-b border-border/50 px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <Logo href="/" />
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {back}
        </Link>
      </div>
    </header>
  );
}

function TermsEs() {
  return (
    <>
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
    </>
  );
}

function TermsEn() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">
        Terms and conditions of service
      </h1>

      <p className="mb-6 rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
        This is an English translation for convenience. The Spanish version is legally
        authoritative.
      </p>

      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="1. The parties">
            <p>
              Rhynode is operated by <strong>[Legal name of the controller — to be completed]</strong>,
              NIT <strong>[NIT — to be completed]</strong>, domiciled in Colombia
              (hereinafter, “Rhynode”). By registering and using the platform, you enter
              into a contract with Rhynode in your capacity as a “User”.
            </p>
          </Section>

          <Section title="2. Purpose of the service">
            <p>
              Rhynode is a personal and business financial management platform that offers:
              account and transaction tracking, budgets, goals, debts, subscriptions,
              client invoicing, tax estimation (including an estimated income tax return),
              cash flow projections, scenarios, a conversational AI advisor, and reports.
              The service is an organization and estimation tool and does not constitute
              accounting, tax, legal, or investment advice.
            </p>
          </Section>

          <Section title="3. Acceptance of the terms">
            <p>
              By using Rhynode you accept these terms. If you do not agree, do not use the
              platform. Use of the service after published modifications implies acceptance
              of the current version.
            </p>
          </Section>

          <Section title="4. Requirements and capacity">
            <p>
              The service is aimed at adults and legally constituted companies in Colombia.
              The User declares that they have legal capacity to be bound and that the
              information they provide is truthful.
            </p>
          </Section>

          <Section title="5. Accounts, credentials, and security">
            <p>
              You are responsible for the confidentiality of your credentials and for all
              activity under your account. You must immediately notify any unauthorized use
              to soporte@rhynode.finance. Rhynode may suspend accounts when there are signs
              of improper use.
            </p>
          </Section>

          <Section title="6. Permitted and prohibited use">
            <p>
              You may use Rhynode to manage your finances and those of your company. It is
              prohibited to use the platform for unlawful, fraudulent activities, that
              violate third-party rights, to launder assets, finance terrorism, or evade
              tax obligations, in accordance with Colombian law.
            </p>
          </Section>

          <Section title="7. Plans, pricing, and billing">
            <p>
              Some plans are paid. Charges are processed through Stripe on the cadence of
              the selected plan. Prices may be updated with prior notice. You can cancel
              your subscription from the account settings; the cancellation will take
              effect at the end of the period already paid. Refunds, if applicable, are
              governed by Stripe’s policy and the Colombian consumer protection law
              (Law 1480 of 2011).
            </p>
          </Section>

          <Section title="8. User content">
            <p>
              You own the information you enter. You grant Rhynode a non-exclusive license
              to process your data solely for the purpose described in the Privacy Policy.
              You can export your data at any time from the platform.
            </p>
          </Section>

          <Section title="9. Artificial intelligence — limitations">
            <p>
              AI features (conversational advisor, receipt OCR, categorization, daily
              summary, income tax estimation) may make mistakes and do not replace
              professional judgment. Categorization and tax estimates are indicative. It is
              your responsibility to review and validate the information before making
              decisions or filing returns. Common advisor queries are resolved without
              invoking an external model; open-ended queries may be sent to an AI provider
              in accordance with the Privacy Policy.
            </p>
          </Section>

          <Section title="10. Intellectual property">
            <p>
              Rights to the platform, its design, and code belong to Rhynode. The content
              you enter remains your property as set out in section 8.
            </p>
          </Section>

          <Section title="11. Limitation of liability">
            <p>
              Rhynode is provided “as is” and to the extent permitted by Colombian law. In
              no event is Rhynode liable for indirect damages, loss of profit, or decisions
              made based on estimates from the platform. Rhynode’s liability is, in any
              case, limited to the amount paid by the User in the previous twelve (12)
              months. Nothing herein excludes non-waivable consumer rights (Law 1480 of
              2011).
            </p>
          </Section>

          <Section title="12. Suspension and termination">
            <p>
              Rhynode may suspend or terminate accounts that breach these terms. The User
              may close their account at any time, which will result in the deletion of
              their data in accordance with the Privacy Policy and the law.
            </p>
          </Section>

          <Section title="13. Force majeure and acts of God">
            <p>
              Neither party is liable for breaches arising from events of force majeure or
              acts of God in accordance with article 64 of the Colombian Civil Code.
            </p>
          </Section>

          <Section title="14. Governing law and jurisdiction">
            <p>
              These terms are governed by the laws of the Republic of Colombia. For any
              dispute, the parties submit to the jurisdiction of the courts of the User’s
              domicile in Colombia or, for consumers, to the competent forum under
              Law 1480 of 2011.
            </p>
          </Section>

          <Section title="15. Modifications">
            <p>
              We may modify these terms. Changes will take effect upon publication on this
              page; continued use implies acceptance of the current version.
            </p>
          </Section>

          <Section title="16. Contact">
            <p>
              For any questions about these terms, write to{" "}
              <a className="text-foreground underline" href="mailto:soporte@rhynode.finance">
                soporte@rhynode.finance
              </a>
              .
            </p>
          </Section>

          <p className="pt-4 text-xs text-muted-foreground">
            Last updated: June 2026. This document is aligned with Colombian law; fields
            marked as “to be completed” must be filled in by the operator before its
            definitive use in production. Final review by a lawyer is recommended.
          </p>
        </CardContent>
      </Card>
    </>
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