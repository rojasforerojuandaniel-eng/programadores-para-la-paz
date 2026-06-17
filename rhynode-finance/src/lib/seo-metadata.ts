import type { Metadata } from "next";

export const BASE_URL = "https://rhynode.finance" as const;
export const DEFAULT_SITE_NAME = "Rhynode" as const;
export const DEFAULT_LOCALE = "es_CO" as const;
export const TWITTER_CREATOR = "@rhynode" as const;

export const DEFAULT_KEYWORDS = [
  "finanzas personales Colombia",
  "contabilidad Colombia",
  "fintech Colombia",
  "facturación electrónica DIAN",
  "impuestos Colombia",
  "Wompi",
  "Stripe",
  "software contable",
  "presupuesto",
  "inversiones Colombia",
  "pymes Colombia",
  "IA financiera",
  "gestión de gastos",
  "control de ingresos",
  "estados financieros",
  "contabilidad electrónica",
  "gestión financiera",
];

export interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  ogType?: "website" | "article" | "profile";
  ogImage?: string;
  twitterImage?: string;
  noIndex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  ogType = "website",
  ogImage,
  twitterImage,
  noIndex = false,
}: SeoOptions): Metadata {
  const fullTitle = `${title} — ${DEFAULT_SITE_NAME}`;
  const canonical = path ? `${BASE_URL}${path}` : undefined;

  return {
    title: fullTitle,
    description,
    keywords: [...keywords, ...DEFAULT_KEYWORDS],
    metadataBase: new URL(BASE_URL),
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url: path ?? "/",
      siteName: DEFAULT_SITE_NAME,
      locale: DEFAULT_LOCALE,
      type: ogType,
      images: ogImage ? [{ url: ogImage, alt: fullTitle }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: TWITTER_CREATOR,
      images: twitterImage ? [{ url: twitterImage, alt: fullTitle }] : undefined,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function dashboardMetadata(
  title: string,
  description?: string,
  path?: string,
): Metadata {
  return buildMetadata({
    title,
    description:
      description ??
      `${title} en Rhynode. Gestiona tus finanzas personales y empresariales con IA para Colombia.`,
    path: path ? `/dashboard${path}` : "/dashboard",
    keywords: [
      "dashboard financiero",
      "finanzas personales",
      "finanzas empresariales",
      "gestión financiera Colombia",
    ],
  });
}
