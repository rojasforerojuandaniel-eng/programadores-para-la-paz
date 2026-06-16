import type { Metadata } from "next";

export function dashboardMetadata(
  title: string,
  description?: string
): Metadata {
  return {
    title: `${title} — Rhynode`,
    description:
      description ??
      `${title} en Rhynode. Gestiona tus finanzas personales y empresariales con IA para Colombia.`,
  };
}
