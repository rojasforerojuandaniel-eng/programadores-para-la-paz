import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileQuestion, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Página no encontrada — Rhynode",
  description:
    "La página que buscas no existe. Vuelve al dashboard de Rhynode.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo href="/" size="lg" />
        </div>

        <section className="flex flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <FileQuestion className="h-10 w-10" aria-hidden="true" />
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            404
          </h1>
          <p className="mb-2 text-xl font-semibold">
            Página no encontrada
          </p>
          <p className="mb-8 max-w-xs text-muted-foreground">
            La ruta que buscas no existe o fue movida. Tu dinero sigue seguro en Rhynode.
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                Ir al inicio
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
