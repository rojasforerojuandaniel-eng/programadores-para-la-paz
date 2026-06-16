"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

const icaRates: Record<string, number> = {
  bogota: 9.66,
  medellin: 13.8,
  cali: 10.2,
  barranquilla: 7.0,
  cartagena: 8.2,
  bucaramanga: 11.0,
};

export function TaxCalculator() {
  const [taxType, setTaxType] = useState<string>("IVA");
  const [baseAmount, setBaseAmount] = useState<string>("");
  const [city, setCity] = useState<string>("bogota");
  const [result, setResult] = useState<{
    rate: number;
    tax: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    const base = Number(baseAmount);
    if (!base || base <= 0) {
      toast.error("Ingresa un monto base válido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: taxType,
          amount: base,
          city: taxType === "ICA" ? city : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        toast.error("Error al calcular impuesto");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  function getRate(): number {
    if (taxType === "IVA") return 19;
    if (taxType === "ReteFuente") return 2.5;
    if (taxType === "ICA") return icaRates[city] || 9.66;
    return 0;
  }

  function getRateLabel(): string {
    const rate = getRate();
    if (taxType === "ICA") return `${rate}‰`;
    return `${rate}%`;
  }

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculadora de Impuestos Colombianos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo de impuesto</Label>
            <Select value={taxType} onValueChange={setTaxType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IVA">IVA (19%)</SelectItem>
                <SelectItem value="ReteFuente">ReteFuente (2.5%)</SelectItem>
                <SelectItem value="ICA">ICA (por ciudad)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calc-amount">Monto base (COP)</Label>
            <Input
              id="calc-amount"
              type="number"
              min={0}
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              placeholder="1,000,000"
            />
          </div>

          {taxType === "ICA" && (
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bogota">Bogotá (9.66‰)</SelectItem>
                  <SelectItem value="medellin">Medellín (13.8‰)</SelectItem>
                  <SelectItem value="cali">Cali (10.2‰)</SelectItem>
                  <SelectItem value="barranquilla">Barranquilla (7‰)</SelectItem>
                  <SelectItem value="cartagena">Cartagena (8.2‰)</SelectItem>
                  <SelectItem value="bucaramanga">Bucaramanga (11‰)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleCalculate} disabled={loading}>
            {loading ? "Calculando..." : "Calcular"}
          </Button>
          <span className="text-sm text-muted-foreground">
            Tasa aplicada: {getRateLabel()}
          </span>
        </div>

        {result && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">Tasa aplicada</div>
              <div className="mt-1 text-xl font-semibold">
                {taxType === "ICA" ? `${result.rate}‰` : `${result.rate}%`}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">Monto del impuesto</div>
              <div className="mt-1 text-xl font-semibold text-primary">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(result.tax)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="mt-1 text-xl font-semibold">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(result.total)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
