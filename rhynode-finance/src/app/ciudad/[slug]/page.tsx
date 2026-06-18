import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, CheckCircle2 } from "lucide-react";

interface CityData {
  slug: string;
  name: string;
  region: string;
  blurb: string;
  examples: string[];
}

export const CITIES: CityData[] = [
  {
    slug: "bogota",
    name: "Bogotá",
    region: "Cundinamarca",
    blurb:
      "Gestión financiera para bogotanos: desde tu salario hasta el pago de servicios de ENSA, EAAB y Codensa, con estimación de declaración de renta adaptada al costo de vida de la capital.",
    examples: [
      "Controla tu arriendo en Chapinero o Usaquén y tus gastos en transporte Transmilenio",
      "Categoriza automáticamente pagos a Codensa, EAAB, Claro y EtB",
      "Estima tu declaración de renta con la tabla DT vigente",
    ],
  },
  {
    slug: "medellin",
    name: "Medellín",
    region: "Antioquia",
    blurb:
      "Finanzas personales y empresariales para paisas: controla tu cuota administrativa en El Poblado, el gasto en Metro y tus compras en Éxito o Carulla, con reportes fiscales para Antioquia.",
    examples: [
      "Haz seguimiento de tu cuota de administración y servicios públicos EPM",
      "Registra ingresos por freelancing o negocio en Laureles/El Poblado",
      "Proyecta tus metas de ahorro con escenarios",
    ],
  },
  {
    slug: "cali",
    name: "Cali",
    region: "Valle del Cauca",
    blurb:
      "Maneja tus finanzas en Cali: desde el pago de servicios de Emcali hasta tus salidas en Granada o el sur, con categorización local y estimación tributaria para el Valle del Cauca.",
    examples: [
      "Registra pagos a Emcali y gastos en Chipichape / Granada",
      "Controla tus suscripciones y detecta las que subieron de precio",
      "Genera reportes de ingresos y gastos exportables",
    ],
  },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then((p) => {
    const city = CITIES.find((c) => c.slug === p.slug);
    if (!city) return buildMetadata({ title: "Ciudad no encontrada", description: "Ciudad no disponible", path: "/ciudad" });
    return buildMetadata({
      title: `Finanzas personales y empresariales en ${city.name}`,
      description: city.blurb,
      path: `/ciudad/${city.slug}`,
      keywords: [
        `finanzas ${city.name}`,
        `contabilidad ${city.name}`,
        `declaración de renta ${city.name}`,
        `${city.region}`,
        "finanzas Colombia",
      ],
    });
  });
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Ciudad no disponible.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo href="/" />
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          {city.region}, Colombia
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Finanzas personales y empresariales en {city.name}
        </h1>
        <p className="text-lg text-muted-foreground">{city.blurb}</p>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">Para qué sirve Rhynode en {city.name}</h2>
            <ul className="space-y-2 text-sm">
              {city.examples.map((ex) => (
                <li key={ex} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Empieza gratis a organizar tus finanzas en {city.name}.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Crear cuenta gratis
          </Link>
        </div>

        <nav className="flex flex-wrap gap-2 text-sm text-muted-foreground" aria-label="Otras ciudades">
          {CITIES.filter((c) => c.slug !== city.slug).map((c) => (
            <Link key={c.slug} href={`/ciudad/${c.slug}`} className="underline hover:text-foreground">
              Finanzas en {c.name}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}