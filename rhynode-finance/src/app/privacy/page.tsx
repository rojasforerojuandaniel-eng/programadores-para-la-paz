import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = buildMetadata({
  title: "Política de privacidad y tratamiento de datos personales",
  description:
    "Política de tratamiento de datos personales de Rhynode conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y el régimen de Habeas Data en Colombia.",
  path: "/privacy",
  keywords: ["privacidad", "protección de datos", "Habeas Data", "Ley 1581", "finanzas Colombia"],
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
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Política de privacidad y tratamiento de datos personales
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Conforme a la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 y el
          régimen constitucional de Habeas Data (art. 15 C.P.).
        </p>

        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
            <Section title="1. Responsable del tratamiento">
              <p>
                El responsable del tratamiento de los datos personales es{" "}
                <strong>[Razón social del responsable — completar]</strong>, con NIT{" "}
                <strong>[NIT — completar]</strong>, domiciliado en Colombia, en adelante
                «Rhynode». Para efectos del tratamiento actúa también como encargado de
                los datos que administra en nombre de sus usuarios.
              </p>
              <p className="mt-2">
                Canal de atención al titular: correo{" "}
                <a className="text-foreground underline" href="mailto:soporte@rhynode.finance">
                  soporte@rhynode.finance
                </a>
                . Responsable de protección de datos (DPO):{" "}
                <strong>[correo/nombre del DPO — completar]</strong>.
              </p>
            </Section>

            <Section title="2. Datos personales que recopilamos">
              <p>Tratamos las siguientes categorías de datos personales:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><strong>Identificación:</strong> nombre, documento de identidad, país y datos del registro de cuenta.</li>
                <li><strong>Contacto:</strong> correo electrónico y teléfono.</li>
                <li><strong>Financieros y tributarios:</strong> cuentas, transacciones, presupuestos, deudas, metas, suscripciones detectadas, facturas, clientes, proyectos e información para estimación fiscal.</li>
                <li><strong>De uso y navegación:</strong> preferencias, configuración, registros de auditoría y métricas de utilización de la plataforma.</li>
              </ul>
            </Section>

            <Section title="3. Finalidad del tratamiento">
              <p>Tratamos tus datos para:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>prestar el servicio de gestión financiera personal y empresarial;</li>
                <li>generar reportes, proyecciones, insights y la declaración de renta estimada;</li>
                <li>categorizar transacciones y detectar suscripciones y duplicados;</li>
                <li>enviar alertas y notificaciones sobre presupuestos, vencimientos y obligaciones;</li>
                <li>procesar pagos de suscripción a través de Stripe;</li>
                <li>mejorar la calidad del servicio y prevenir fraudes; y</li>
                <li>cumplir obligaciones legales colombianas aplicables.</li>
              </ul>
            </Section>

            <Section title="4. Autorización del titular">
              <p>
                Conforme al artículo 9 de la Ley 1581 de 2012, el tratamiento de tus
                datos personales se realiza con tu autorización previa, expresa e
                informada, que otorgas al crear tu cuenta y aceptar esta política. La
                autorización es revocable en cualquier momento sin afectar la licitud del
                tratamiento realizado antes de la revocación.
              </p>
            </Section>

            <Section title="5. Datos sensibles y datos financieros">
              <p>
                La información financiera recopilada tiene naturaleza sensible por su
                relación con tu patrimonio. El tratamiento se realiza únicamente con tu
                autorización expresa y con las medidas de seguridad del artículo 26 de la
                Ley 1581. No tratamos datos sensibles enumerados en el artículo 5
                (salud, biométricos, orientación, etc.) salvo los estrictamente necesarios
                para finalidades contables que tú autorices.
              </p>
            </Section>

            <Section title="6. Cesión a terceros y encargados del tratamiento">
              <p>
                No vendemos tus datos personales. Para prestar el servicio utilizamos los
                siguientes encargados/subprocesadores, que tratan datos bajo nuestras
                instrucciones y con sus propias medidas de seguridad:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><strong>Clerk</strong> — autenticación y gestión de identidad.</li>
                <li><strong>Vercel</strong> — alojamiento de la aplicación.</li>
                <li><strong>Neon</strong> — base de datos (PostgreSQL).</li>
                <li><strong>Stripe</strong> — procesamiento de pagos de suscripción.</li>
                <li><strong>Anthropic / Ollama</strong> — servicios de IA para asesor, OCR y resúmenes.</li>
                <li><strong>tasas.agentes-ai.com.co</strong> — consulta de la TRM y tasas.</li>
              </ul>
              <p className="mt-2">
                Cualquier cesión distinta requerirá autorización adicional del titular.
              </p>
            </Section>

            <Section title="7. Transferencia y transmisión internacional">
              <p>
                Algunos encargados (Clerk, Vercel, Neon, Stripe, Anthropic) pueden procesar
                datos en Estados Unidos u otros países. Estas transferencias se realizan a
                proveedores con estándares adecuados de protección y se sujetan a los
                artículos 26 y 27 de la Ley 1581 y la Circular Externa 002 de 2015 de la SIC.
              </p>
            </Section>

            <Section title="8. Medidas de seguridad">
              <p>
                Aplicamos medidas técnicas y organizativas: cifrado en tránsito (TLS) y en
                reposo (AES-256-GCM para datos sensibles del cliente), autenticación mediante
                Clerk, control de acceso basado en roles, registros de auditoría, limitación
                de tasa en endpoints y procedimientos de acceso restringido a producción.
              </p>
            </Section>

            <Section title="9. Conservación y supresión">
              <p>
                Conservamos tus datos mientras mantengas la cuenta activa y durante los
                períodos requeridos por obligaciones legales o contables colombianas. Al
                cerrar tu cuenta, suprimimos tus datos personales salvo los que debamos
                conservar por mandato legal, los cuales se mantienen bloqueados.
              </p>
            </Section>

            <Section title="10. Derechos del titular (ARCO)">
              <p>Como titular puedes ejercer en cualquier momento los derechos de:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><strong>Acceso</strong> a tus datos personales tratados.</li>
                <li><strong>Rectificación</strong> de datos inexactos o incompletos.</li>
                <li><strong>Cancelación/supresión</strong> de tus datos.</li>
                <li><strong>Oposición</strong> al tratamiento por motivos legítimos.</li>
                <li><strong>Revocación</strong> de la autorización otorgada.</li>
              </ul>
              <p className="mt-2">
                Puedes ejercerlos escribiendo a{" "}
                <a className="text-foreground underline" href="mailto:soporte@rhynode.finance">
                  soporte@rhynode.finance
                </a>{" "}
                indicando el derecho a ejercer. Atenderemos tu solicitud en un plazo máximo
                de diez (10) días hábiles, prorrogables conforme al artículo 14 del Decreto 1377.
              </p>
            </Section>

            <Section title="11. Menores de edad">
              <p>
                El servicio no está dirigido a menores de edad. No recopilamos
                deliberadamente datos de menores de 18 años. Si detectamos que un menor nos
                ha proporcionado datos, procederemos a su supresión.
              </p>
            </Section>

            <Section title="12. Consultas, reclamos y Superintendencia">
              <p>
                Si consideras que hemos vulnerado tus derechos, puedes presentar reclamo
                ante la Delegatura para la Protección de Datos Personales de la
                Superintendencia de Industria y Comercio (SIC).
              </p>
            </Section>

            <Section title="13. Modificaciones">
              <p>
                Podemos actualizar esta política. Te notificaremos los cambios
                sustanciales mediante la aplicación o correo. La versión vigente es la
                publicada en esta página.
              </p>
            </Section>

            <p className="pt-4 text-xs text-muted-foreground">
              Última actualización: junio de 2026. Esta política es un borrador alineado a
              la normativa colombiana; los campos marcados como «completar» deben ser
              diligenciados por el responsable antes de su uso definitivo en producción.
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