"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COMMON_CATEGORIES = [
  "Ventas",
  "Nómina",
  "Servicios",
  "Materiales",
  "Marketing",
  "Transporte / Delivery",
  "Entretenimiento",
  "Café",
  "Mercado",
  "Restaurante",
  "Transporte",
  "Telecomunicaciones",
  "Servicios públicos",
  "Seguros",
  "Salud",
  "Educación",
  "Transferencia/Finanzas",
  "Ropa",
  "Viajes",
  "Mascotas",
  "Compras",
  "Otros",
];

interface OcrItem {
  description: string;
  amount: number;
}

interface OcrResult {
  merchant: string;
  total: number;
  date: string;
  items: OcrItem[];
  confidence: number;
}

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrItems, setOcrItems] = useState<OcrItem[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [form, setForm] = useState({
    type: "INCOME" as "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT",
    category: "",
    description: "",
    amount: "",
    currency: "COP",
    reference: "",
    date: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      type: "INCOME",
      category: "",
      description: "",
      amount: "",
      currency: "COP",
      reference: "",
      date: "",
    });
    setAiConfidence(null);
    setOcrItems([]);
    setOcrConfidence(null);
  }, []);

  const handleAiSuggest = useCallback(async (description: string, amount: number) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount }),
      });
      if (res.ok) {
        const data = (await res.json()) as { category?: string; confidence?: number };
        if (data.category) {
          setForm((prev) => ({ ...prev, category: data.category ?? prev.category }));
          setAiConfidence(data.confidence ?? null);
        }
      }
    } catch {
      // Auto-suggest should fail silently.
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!form.description.trim() || !form.amount || form.category) return;
    const timeout = setTimeout(() => {
      handleAiSuggest(form.description, Number(form.amount));
    }, 700);
    return () => clearTimeout(timeout);
  }, [form.description, form.amount, form.category, handleAiSuggest]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      if (res.ok) {
        resetForm();
        onSuccess();
      } else {
        toast.error("Error al crear transacción");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function handleAiSuggestButton() {
    if (!form.description.trim() || !form.amount) {
      toast.error("Ingresa descripción y monto primero");
      return;
    }
    await handleAiSuggest(form.description, Number(form.amount));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrItems([]);
    setOcrConfidence(null);
    try {
      const dataUrl = await fileToBase64(file);
      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || "Error al procesar el recibo");
        return;
      }
      const data = (await res.json()) as OcrResult;

      const categoryRes = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: data.merchant,
          amount: data.total,
        }),
      });
      let category = "";
      if (categoryRes.ok) {
        const catData = (await categoryRes.json()) as { category?: string; confidence?: number };
        category = catData.category || "";
        setAiConfidence(catData.confidence ?? null);
      }

      setForm((prev) => ({
        ...prev,
        description: data.merchant || prev.description,
        amount: data.total ? String(data.total) : prev.amount,
        date: data.date ? data.date.split("T")[0] : prev.date,
        category,
        type: "EXPENSE",
      }));

      setOcrItems(data.items || []);
      setOcrConfidence(data.confidence);

      if (data.confidence >= 0.7) {
        toast.success("Recibo escaneado correctamente");
      } else {
        toast.warning("El escaneo tuvo baja confianza. Revisa los datos.");
      }
    } catch {
      toast.error("Error al procesar el recibo");
    } finally {
      setOcrLoading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function confidenceLabel(confidence: number) {
    if (confidence >= 0.8) return { text: "Alta", variant: "default" as const };
    if (confidence >= 0.6) return { text: "Media", variant: "secondary" as const };
    return { text: "Baja", variant: "destructive" as const };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Escanear recibo</span>
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={ocrLoading}
          className="cursor-pointer text-sm"
          aria-label="Cargar imagen del recibo"
        />
        {ocrLoading && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando imagen...
          </div>
        )}
        {ocrConfidence !== null && !ocrLoading && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Confianza OCR:</span>
            <Badge variant={confidenceLabel(ocrConfidence).variant}>
              {confidenceLabel(ocrConfidence).text}
            </Badge>
          </div>
        )}
        {ocrItems.length > 0 && ocrConfidence !== null && ocrConfidence > 0.7 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Items detectados:</p>
            <div className="max-h-32 overflow-auto rounded border border-muted-foreground/20 p-2">
              {ocrItems.map((item, idx) => (
                <div key={idx} className="flex justify-between py-0.5 text-xs">
                  <span className="truncate">{item.description}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.amount.toLocaleString("es-CO")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tx-type">Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(value) => setForm({ ...form, type: value as typeof form.type })}
          >
            <SelectTrigger id="tx-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">Ingreso</SelectItem>
              <SelectItem value="EXPENSE">Gasto</SelectItem>
              <SelectItem value="TRANSFER">Transferencia</SelectItem>
              <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-currency">Moneda</Label>
          <Select
            value={form.currency}
            onValueChange={(value) => setForm({ ...form, currency: value })}
          >
            <SelectTrigger id="tx-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COP">COP</SelectItem>
              <SelectItem value="MXN">MXN</SelectItem>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-desc">Descripción *</Label>
        <Input
          id="tx-desc"
          required
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Ej. Pago de factura mensual"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tx-amount">Monto *</Label>
          <Input
            id="tx-amount"
            type="number"
            required
            min={0}
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-date">Fecha</Label>
          <Input
            id="tx-date"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tx-category">Categoría</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1 px-2 text-xs text-primary"
              onClick={handleAiSuggestButton}
              disabled={aiLoading || !form.description.trim() || !form.amount}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? "Analizando..." : "Sugerir con IA"}
            </Button>
          </div>
          <Select
            value={form.category}
            onValueChange={(value) => {
              setForm({ ...form, category: value });
              setAiConfidence(null);
            }}
          >
            <SelectTrigger id="tx-category">
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {aiConfidence !== null && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Confianza IA:</span>
              <Badge variant={confidenceLabel(aiConfidence).variant}>
                {confidenceLabel(aiConfidence).text}
              </Badge>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-ref">Referencia</Label>
          <Input
            id="tx-ref"
            value={form.reference}
            onChange={(event) => setForm({ ...form, reference: event.target.value })}
            placeholder="Número de referencia bancaria"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full sm:w-auto"
          onClick={() => onCancel?.()}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="h-10 w-full sm:w-auto">
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
