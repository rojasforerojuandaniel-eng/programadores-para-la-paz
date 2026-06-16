import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <WifiOff className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="max-w-sm text-muted-foreground">
        Parece que no tienes acceso a internet en este momento. Algunas funciones pueden no estar disponibles.
      </p>
      <Button asChild>
        <Link href="/dashboard">Intentar de nuevo</Link>
      </Button>
    </div>
  );
}
