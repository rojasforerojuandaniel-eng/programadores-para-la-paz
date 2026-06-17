import type { Metadata } from "next";

import { OfflineContent } from "@/components/offline-content";

export const metadata: Metadata = {
  title: "Sin conexión — Rhynode",
  description:
    "Parece que no tienes acceso a internet. Algunas funciones de Rhynode siguen disponibles offline.",
};

export default function OfflinePage() {
  return <OfflineContent />;
}
