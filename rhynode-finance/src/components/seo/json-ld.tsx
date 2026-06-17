const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Rhynode",
  url: "https://rhynode.finance",
  sameAs: [
    "https://twitter.com/rhynode",
    "https://www.linkedin.com/company/rhynode",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "soporte@rhynode.finance",
    contactType: "Customer Support",
    areaServed: "CO",
    availableLanguage: ["Spanish"],
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Rhynode",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "COP",
    description: "Plan gratuito disponible. Planes de pago según el volumen de tu negocio.",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "120",
  },
  description:
    "Software de finanzas personales y contabilidad empresarial con IA para Colombia. Integra Wompi, cumple con la DIAN y gestiona facturación electrónica, impuestos, presupuestos e inversiones.",
  url: "https://rhynode.finance",
  inLanguage: "es",
  countriesSupported: "CO",
};

export function JsonLdScripts() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd),
        }}
      />
    </>
  );
}
