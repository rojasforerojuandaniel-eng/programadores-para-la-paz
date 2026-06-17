"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ExternalLink,
  Link2,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type SubscriptionStatus =
  | "ACTIVE"
  | "PENDING_CANCELLATION"
  | "CANCELED";

interface SubscriptionStatusActionsProps {
  id: string;
  status: SubscriptionStatus;
  cancellationUrl: string | null;
}

export function SubscriptionStatusActions({
  id,
  status,
  cancellationUrl,
}: SubscriptionStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [url, setUrl] = useState(cancellationUrl || "");

  async function updateStatus(
    newStatus: SubscriptionStatus,
    urlToSave?: string
  ): Promise<boolean> {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
          ...(urlToSave !== undefined ? { cancellationUrl: urlToSave } : {}),
        }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar");
        return false;
      }
      router.refresh();
      toast.success(
        newStatus === "PENDING_CANCELLATION"
          ? "Marcada para cancelar"
          : newStatus === "CANCELED"
            ? "Suscripción cancelada"
            : "Suscripción reactivada"
      );
      return true;
    } catch {
      toast.error("Error de red");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await updateStatus("PENDING_CANCELLATION");
    if (ok && cancellationUrl) {
      window.open(cancellationUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault();
    await updateStatus(status, url || undefined);
    setUrlDialogOpen(false);
  }

  if (status === "CANCELED") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateStatus("ACTIVE")}
        disabled={loading}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reactivar
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "ACTIVE" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            aria-label="Marcar para cancelar"
          >
            {cancellationUrl ? (
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            Cancelar
          </Button>
          <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Editar enlace
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="heading-card">
                  Enlace de cancelación
                </DialogTitle>
                <DialogDescription>
                  Guarda el enlace directo para cancelar esta suscripción.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveUrl} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor={`cancel-url-${id}`}>URL para cancelar</Label>
                  <Input
                    id={`cancel-url-${id}`}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://netflix.com/cancel"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setUrlDialogOpen(false)}
                  >
                    Cerrar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Guardar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
      {status === "PENDING_CANCELLATION" && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => updateStatus("CANCELED")}
            disabled={loading}
            aria-label="Confirmar que ya cancelé"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Ya cancelé
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateStatus("ACTIVE")}
            disabled={loading}
            aria-label="Reactivar suscripción"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reactivar
          </Button>
        </>
      )}
    </div>
  );
}
