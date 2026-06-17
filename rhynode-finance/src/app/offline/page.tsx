import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import { OfflineContent } from "@/components/offline-content";

export const metadata: Metadata = buildMetadata({
  title: "Sin conexión",
  description:
    "Parece que no tienes acceso a internet. Algunas funciones de Rhynode siguen disponibles offline.",
  path: "/offline",
  noIndex: true,
});

export default function OfflinePage() {
  return <OfflineContent />;
}
