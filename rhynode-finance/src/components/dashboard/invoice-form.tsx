"use client";

import { useEffect, useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

interface InvoiceFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({
    clientId: "",
    number: "",
    currency: "COP",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    terms: "",
  });
  const [items, setItems] = useState<InvoiceItemForm[]>([
    { description: "", quantity: "1", unitPrice: "", taxRate: "19" },
  ]);

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.clientId || !form.number.trim()) return;

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
        setForm({
          clientId: "",
          number: "",
          currency: "COP",
          issueDate: new Date().toISOString().split("T")[0],
          dueDate: "",
          notes: "",
          terms: "",
        });
        setItems([
          { description: "", quantity: "1", unitPrice: "", taxRate: "19" },
        ]);
        onSuccess();
      } else {
        toast.error("Error al crear factura");
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
          <Label htmlFor="inv-number">Número de factura *</Label>
          <Input
            id="inv-number"
            required
            value={form.number}
            onChange={(event) =>
              setForm({ ...form, number: event.target.value })
            }
            placeholder="Ej. F-001"
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
