import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildMetadata({
    title: "Pago seguro",
    description:
      "Realiza tu pago de forma segura con Rhynode. Aceptamos tarjeta vía Stripe y Wompi para Colombia.",
    path: `/pay/${slug}`,
    keywords: ["pago seguro", "Wompi", "Stripe", "pasarela de pagos Colombia"],
    noIndex: true,
  });
}

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
