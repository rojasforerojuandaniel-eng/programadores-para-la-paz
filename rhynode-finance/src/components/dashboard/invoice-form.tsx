"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { InvoicePreview } from "@/components/dashboard/invoice-preview";

interface ClientOption {
  id: string;
  name: string;
}

interface InvoiceItemForm {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

interface InvoiceFormItemDefault {
  description: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
}

export interface InvoiceFormDefaultValues {
  clientId?: string;
  number?: string;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  terms?: string;
  items?: InvoiceFormItemDefault[];
}

interface InvoiceFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
  defaultValues?: InvoiceFormDefaultValues;
}

function todayInputValue() {
  return new Date().toISOString().split("T")[0];
}

function toItemString(value: number | undefined, fallback: string): string {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return String(value);
}

export function InvoiceForm({ onSuccess, onCancel, defaultValues }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({
    clientId: defaultValues?.clientId || "",
    number: defaultValues?.number || "",
    currency: defaultValues?.currency || "COP",
    issueDate: defaultValues?.issueDate || todayInputValue(),
    dueDate: defaultValues?.dueDate || "",
    notes: defaultValues?.notes || "",
    terms: defaultValues?.terms || "",
  });
  const [items, setItems] = useState<InvoiceItemForm[]>(
    defaultValues?.items && defaultValues.items.length > 0
      ? defaultValues.items.map((item) => ({
          description: item.description || "",
          quantity: toItemString(item.quantity, "1"),
          unitPrice: toItemString(item.unitPrice, ""),
          taxRate: toItemString(item.taxRate, "19"),
        }))
      : [{ description: "", quantity: "1", unitPrice: "", taxRate: "19" }]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data: { clients?: ClientOption[] }) => {
        if (!cancelled) setClients(data.clients || []);
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: "1", unitPrice: "", taxRate: "19" },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: keyof InvoiceItemForm,
    value: string,
  ) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  const previewInvoice = useMemo(() => {
    const validItems = items
      .filter((item) => item.description.trim() && Number(item.unitPrice) > 0)
      .map((item) => {
        const quantity = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const lineSubtotal = quantity * unitPrice;
        const lineTax = (lineSubtotal * taxRate) / 100;
        return {
          description: item.description,
          quantity,
          unitPrice,
          taxRate,
          total: lineSubtotal + lineTax,
        };
      });

    const subtotal = validItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxRate = validItems.length > 0 ? validItems[0].taxRate : 0;
    const taxAmount = validItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      return sum + (lineSubtotal * item.taxRate) / 100;
    }, 0);
    const total = subtotal + taxAmount;

    const client = clients.find((c) => c.id === form.clientId);

    return {
      number: form.number.trim() || "PREVIEW",
      status: "DRAFT",
      currency: form.currency,
      issueDate: form.issueDate || todayInputValue(),
      dueDate: form.dueDate || null,
      client: client ? { name: client.name } : undefined,
      items: validItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: form.notes,
      terms: form.terms,
    };
  }, [form, items, clients]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.clientId) {
      toast.error("Selecciona un cliente");
      return;
    }

    const validItems = items
      .filter((item) => item.description.trim() && Number(item.unitPrice) > 0)
      .map((item) => ({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 19,
        discount: 0,
      }));

    if (validItems.length === 0) {
      toast.error("Agrega al menos un ítem válido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: validItems,
          issueDate: new Date(form.issueDate).toISOString(),
          dueDate: form.dueDate
            ? new Date(form.dueDate).toISOString()
            : undefined,
        }),
      });
      if (res.ok) {
        trackEvent("invoice_created", {
          currency: form.currency,
          itemCount: validItems.length,
        });
        toast.success("Factura creada correctamente");
        setForm({
          clientId: "",
          number: "",
          currency: "COP",
          issueDate: todayInputValue(),
          dueDate: "",
          notes: "",
          terms: "",
        });
        setItems([
          { description: "", quantity: "1", unitPrice: "", taxRate: "19" },
        ]);
        setShowPreview(false);
        onSuccess();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Error al crear factura");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inv-client">Cliente *</Label>
          <Select
            value={form.clientId}
            onValueChange={(value) => setForm({ ...form, clientId: value })}
          >
            <SelectTrigger id="inv-client">
              <SelectValue placeholder="Seleccionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-number">Número de factura</Label>
          <Input
            id="inv-number"
            value={form.number}
            onChange={(event) =>
              setForm({ ...form, number: event.target.value })
            }
            placeholder="Ej. F-001 (se genera automáticamente si se deja vacío)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="inv-currency">Moneda</Label>
          <Select
            value={form.currency}
            onValueChange={(value) => setForm({ ...form, currency: value })}
          >
            <SelectTrigger id="inv-currency">
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
        <div className="space-y-2">
          <Label htmlFor="inv-issue">Fecha de emisión</Label>
          <Input
            id="inv-issue"
            type="date"
            value={form.issueDate}
            onChange={(event) =>
              setForm({ ...form, issueDate: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-due">Fecha de vencimiento</Label>
          <Input
            id="inv-due"
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm({ ...form, dueDate: event.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ítems</Label>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={addItem}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Agregar ítem
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-end"
            >
              <div className="sm:col-span-5">
                <Input
                  placeholder="Descripción"
                  aria-label={`Descripción del ítem ${idx + 1}`}
                  value={item.description}
                  onChange={(event) =>
                    updateItem(idx, "description", event.target.value)
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Cant."
                  aria-label={`Cantidad del ítem ${idx + 1}`}
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(idx, "quantity", event.target.value)
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Precio"
                  aria-label={`Precio unitario del ítem ${idx + 1}`}
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(idx, "unitPrice", event.target.value)
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="IVA %"
                  aria-label={`Porcentaje de impuesto del ítem ${idx + 1}`}
                  value={item.taxRate}
                  onChange={(event) =>
                    updateItem(idx, "taxRate", event.target.value)
                  }
                />
              </div>
              <div className="flex justify-end sm:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  aria-label={`Eliminar ítem ${idx + 1}`}
                >
                  <Trash2 className="h-5 w-5 text-red-400" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inv-notes">Notas</Label>
        <Input
          id="inv-notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Notas adicionales para el cliente"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inv-terms">Términos</Label>
        <Input
          id="inv-terms"
          value={form.terms}
          onChange={(event) => setForm({ ...form, terms: event.target.value })}
          placeholder="Ej. Pago a 30 días"
        />
      </div>

      {showPreview && (
        <div className="pt-2">
          <InvoicePreview invoice={previewInvoice} />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full sm:w-auto"
          onClick={() => onCancel?.()}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-2 sm:w-auto"
          onClick={() => setShowPreview((prev) => !prev)}
        >
          {showPreview ? (
            <>
              <EyeOff className="h-4 w-4" /> Ocultar vista previa
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" /> Vista previa
            </>
          )}
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full sm:w-auto"
        >
          {loading ? "Guardando..." : "Guardar Factura"}
        </Button>
      </div>
    </form>
  );
}
