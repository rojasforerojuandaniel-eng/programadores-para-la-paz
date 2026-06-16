"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Link as LinkIcon, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Bank {
  id: string;
  name: string;
  status: string;
  logo?: string;
}

export default function IntegrationsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [notified, setNotified] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBanks() {
      try {
        const res = await fetch("/api/integrations/banks");
        const data = await res.json();
        setBanks(data.banks || []);
      } catch {
        toast.error("Error al cargar bancos");
      } finally {
        setLoading(false);
      }
    }
    fetchBanks();
  }, []);

  function handleNotify(bankId: string) {
    setNotified((prev) => [...prev, bankId]);
    toast.success("Te notificaremos cuando esté disponible");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Integraciones</h1>
        <p className="body-default mt-1">Conecta tus bancos y servicios automáticamente</p>
      </div>

      <Card className="surface-elevated-2 border border-primary/20">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Open Banking está llegando a Colombia</p>
            <p className="body-small text-muted-foreground">
              El Decreto 0368 de 2026 obliga a todos los bancos a exponer APIs seguras.
              Rhynode será uno de los primeros en integrarse.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="surface-elevated-2 animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))
          : banks.map((bank) => {
              const isNotified = notified.includes(bank.id);
              return (
                <Card key={bank.id} className="surface-elevated-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="heading-card text-base">{bank.name}</CardTitle>
                      <Badge variant="outline">Próximamente</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="body-small mb-3 text-muted-foreground">
                      Sincroniza transacciones automáticamente desde {bank.name}.
                    </p>
                    <Button
                      variant={isNotified ? "outline" : "default"}
                      size="sm"
                      className="w-full gap-2"
                      disabled={isNotified}
                      onClick={() => handleNotify(bank.id)}
                    >
                      {isNotified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Te avisaremos
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4" />
                          Notificarme
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            ¿Qué es Open Banking?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Open Banking permite que apps autorizadas accedan a tus datos bancarios
            de forma segura, con tu permiso explícito. Esto significa:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tus transacciones se importan automáticamente sin escribir nada</li>
            <li>La IA categoriza tus gastos al instante</li>
            <li>Recibes alertas de anomalías en tiempo real</li>
            <li>Tus datos están encriptados y nunca se venden</li>
          </ul>
          <p>
            En Colombia, el <strong>Decreto 0368 de abril 2026</strong> hizo Open Finance
            obligatorio para todas las entidades financieras supervisadas por la SFC.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
