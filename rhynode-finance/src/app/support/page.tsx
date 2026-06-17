import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Soporte",
  description:
    "Contacta al equipo de soporte de Rhynode. Estamos aquí para ayudarte con tus finanzas personales y empresariales en Colombia.",
  path: "/support",
  keywords: ["soporte", "ayuda", "contacto", "finanzas Colombia"],
});

export default function SupportPage() {
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
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Soporte</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="font-semibold">Correo electrónico</h2>
              <p className="text-sm text-muted-foreground">
                Escríbenos a soporte@rhynode.finance y te responderemos en menos de
                24 horas hábiles.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-auto">
                <a href="mailto:soporte@rhynode.finance">Enviar correo</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="font-semibold">Preguntas frecuentes</h2>
              <p className="text-sm text-muted-foreground">
                Encuentra respuestas rápidas en la sección FAQ de nuestra página de
                inicio.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-auto">
                <Link href="/#faq">Ver FAQ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-border/50 bg-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">¿Necesitas ayuda para empezar?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Completa el onboarding y explora el dashboard. Si tienes dudas
                  sobre funciones específicas, contáctanos directamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
