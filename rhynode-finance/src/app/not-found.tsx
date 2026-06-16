import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada — Rhynode",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">La página que buscas no existe.</p>
      <Button asChild>
        <Link href="/dashboard">Volver al Dashboard</Link>
      </Button>
    </div>
  );
}
