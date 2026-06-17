import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { JsonLdScripts } from "@/components/seo/json-ld";
import dynamic from "next/dynamic";
import "./globals.css";

const InstallPrompt = dynamic(() => import("@/components/pwa/install-prompt"));
const ServiceWorkerRegister = dynamic(() => import("@/components/pwa/service-worker-register").then(m => ({ default: m.ServiceWorkerRegister })));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Rhynode — Finanzas personales e inteligencia contable para Colombia",
  description:
    "Controla tu dinero, ahorra más inteligente y haz crecer tu negocio. Rhynode une finanzas personales y empresariales con IA para Colombia. Integra Wompi, cumple con la DIAN y gestiona tu contabilidad y facturación electrónica en minutos.",
  keywords: [
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
  ],
  authors: [{ name: "Rhynode" }],
  creator: "Rhynode",
  publisher: "Rhynode",
  metadataBase: new URL("https://rhynode.finance"),
  alternates: {
    canonical: "https://rhynode.finance/",
  },
  openGraph: {
    title: "Rhynode — Finanzas personales e inteligencia contable para Colombia",
    description:
      "Controla tu dinero, ahorra más inteligente y haz crecer tu negocio. Rhynode une finanzas personales y empresariales con IA para Colombia. Integra Wompi, cumple con la DIAN y gestiona tu contabilidad y facturación electrónica en minutos.",
    url: "https://rhynode.finance/",
    siteName: "Rhynode",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rhynode — Finanzas personales e inteligencia contable para Colombia",
    description:
      "Controla tu dinero, ahorra más inteligente y haz crecer tu negocio. Rhynode une finanzas personales y empresariales con IA para Colombia.",
    creator: "@rhynode",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Rhynode",
    statusBarStyle: "black-translucent",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <JsonLdScripts />
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Saltar al contenido principal
        </a>
        <Providers>{children}</Providers>
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
