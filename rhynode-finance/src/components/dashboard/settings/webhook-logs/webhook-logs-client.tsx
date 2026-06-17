"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Webhook,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface WebhookLog {
  id: string;
  provider: string;
  eventType: string;
  externalId: string | null;
  status: string;
  processedAt: string | null;
  createdAt: string;
  payloadPreview: string;
  errorMessage: string | null;
}

interface Pagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const providerOptions = [
  { value: "all", label: "Todos" },
  { value: "stripe", label: "Stripe" },
  { value: "wompi", label: "Wompi" },
];

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "success", label: "Exitoso" },
  { value: "failed", label: "Fallido" },
  { value: "pending", label: "Pendiente" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PROCESSED") {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Exitoso
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Fallido
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pendiente
    </Badge>
  );
}

export default function WebhookLogsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    limit: PAGE_SIZE,
    offset: 0,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [liveRegion, setLiveRegion] = useState("");

  const provider = searchParams.get("provider") || "all";
  const status = searchParams.get("status") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

  const buildQueryString = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      return params.toString();
    },
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchLogs() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (provider && provider !== "all") params.set("provider", provider);
      if (status && status !== "all") params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      try {
        const res = await fetch(`/api/webhook-logs?${params.toString()}`);
        if (!res.ok) throw new Error("Error al cargar logs");
        const json = await res.json();
        if (!cancelled) {
          setLogs(json.data || []);
          setPagination(json.pagination || { limit: PAGE_SIZE, offset, total: 0, hasMore: false });
        }
      } catch {
        if (!cancelled) {
          toast.error("Error al cargar logs de webhooks");
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [provider, status, from, to, offset]);

  function updateFilter(key: string, value: string | number | undefined) {
    const query = buildQueryString({ [key]: value, offset: 0 });
    router.replace(`/dashboard/settings/webhook-logs?${query}`, { scroll: false });
  }

  function goToPage(newOffset: number) {
    const query = buildQueryString({ offset: newOffset });
    router.replace(`/dashboard/settings/webhook-logs?${query}`, { scroll: false });
  }

  async function handleRetry(log: WebhookLog) {
    setRetryingId(log.id);
    setLiveRegion(`Reintentando webhook ${log.eventType}...`);
    try {
      const res = await fetch(`/api/webhook-logs/${log.id}/retry`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Error al reintentar");
      }
      toast.success("Webhook reintentado exitosamente");
      setLiveRegion("Reintento exitoso. Actualizando lista.");
      const params = new URLSearchParams(searchParams.toString());
      router.refresh();
      router.replace(`/dashboard/settings/webhook-logs?${params.toString()}`, { scroll: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al reintentar";
      toast.error(message);
      setLiveRegion(`Error al reintentar: ${message}`);
    } finally {
      setRetryingId(null);
    }
  }

  const hasFilters = provider !== "all" || status !== "all" || from || to;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="heading-section">Logs de Webhooks</h1>
        <p className="body-default">Observabilidad de eventos entrantes de Stripe y Wompi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="heading-card">Filtros</CardTitle>
          <CardDescription>Refina los eventos por proveedor, estado o rango de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="provider-filter">Proveedor</Label>
              <Select value={provider} onValueChange={(v) => updateFilter("provider", v)}>
                <SelectTrigger id="provider-filter" aria-label="Filtrar por proveedor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Estado</Label>
              <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
                <SelectTrigger id="status-filter" aria-label="Filtrar por estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-filter">Desde</Label>
              <Input
                id="from-filter"
                type="datetime-local"
                value={from}
                onChange={(e) => updateFilter("from", e.target.value)}
                aria-label="Fecha inicial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-filter">Hasta</Label>
              <Input
                id="to-filter"
                type="datetime-local"
                value={to}
                onChange={(e) => updateFilter("to", e.target.value)}
                aria-label="Fecha final"
              />
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => {
                router.replace("/dashboard/settings/webhook-logs", { scroll: false });
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="sr-only" aria-live="polite">
        {liveRegion}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="heading-card">Eventos</CardTitle>
              <CardDescription>
                Mostrando {logs.length} de {pagination.total} eventos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center" role="status" aria-live="polite">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="sr-only ml-2">Cargando logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Webhook className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-medium">No hay eventos registrados</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Ajusta los filtros o vuelve más tarde cuando lleguen nuevos webhooks.
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.replace("/dashboard/settings/webhook-logs", { scroll: false })}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Timestamp</TableHead>
                    <TableHead scope="col">Proveedor</TableHead>
                    <TableHead scope="col">Evento</TableHead>
                    <TableHead scope="col">Estado</TableHead>
                    <TableHead scope="col">Payload preview</TableHead>
                    <TableHead scope="col">Error</TableHead>
                    <TableHead scope="col" className="text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell title={new Date(log.createdAt).toISOString()}>
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{log.provider}</TableCell>
                      <TableCell className="font-mono text-xs">{log.eventType}</TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {log.payloadPreview}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-destructive text-xs">
                        {log.errorMessage ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Ver payload de ${log.eventType}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Payload completo</DialogTitle>
                                <DialogDescription>
                                  {log.provider} — {log.eventType} — {formatDate(log.createdAt)}
                                </DialogDescription>
                              </DialogHeader>
                              <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-4 font-mono text-xs">
                                <code>{log.payloadPreview}</code>
                              </pre>
                            </DialogContent>
                          </Dialog>

                          {(log.status === "FAILED" || log.status === "PENDING") && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Reintentar ${log.eventType} de ${log.provider}`}
                              disabled={retryingId === log.id}
                              onClick={() => handleRetry(log)}
                            >
                              {retryingId === log.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="sr-only sm:not-sr-only sm:ml-1">Reintentar</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1">Anterior</span>
              </Button>
              <span className="text-sm text-muted-foreground" aria-live="polite">
                Página {Math.floor(offset / PAGE_SIZE) + 1} de{" "}
                {Math.max(1, Math.ceil(pagination.total / PAGE_SIZE))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(offset + PAGE_SIZE)}
                disabled={!pagination.hasMore}
                aria-label="Página siguiente"
              >
                <span className="mr-1">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
