"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function CreateInvoiceDialog({ onCreate }: { onCreate: () => void }) {
  const [open, setOpen] = useState(false);
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
    if (open) {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((data) => setClients(data.clients || []))
        .catch(() => setClients([]));
    }
  }, [open]);

  function addItem() {
    setItems([...items, { description: "", quantity: "1", unitPrice: "", taxRate: "19" }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof InvoiceItemForm, value: string) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.number.trim()) return;
    const validItems = items
      .filter((it) => it.description.trim() && Number(it.unitPrice) > 0)
      .map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: Number(it.taxRate) || 19,
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
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({
          clientId: "",
          number: "",
          currency: "COP",
          issueDate: new Date().toISOString().split("T")[0],
          dueDate: "",
          notes: "",
          terms: "",
        });
        setItems([{ description: "", quantity: "1", unitPrice: "", taxRate: "19" }]);
        onCreate();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="heading-card">Nueva Factura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inv-client">Cliente *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm({ ...form, clientId: v })}
              >
                <SelectTrigger id="inv-client">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="Ej. F-001"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="inv-currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
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
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-due">Fecha de vencimiento</Label>
              <Input
                id="inv-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ítems</Label>
              <Button type="button" variant="outline" className="h-10" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1.5" /> Agregar ítem
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
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Cant."
                      aria-label={`Cantidad del ítem ${idx + 1}`}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Precio"
                      aria-label={`Precio unitario del ítem ${idx + 1}`}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="IVA %"
                      aria-label={`Porcentaje de impuesto del ítem ${idx + 1}`}
                      value={item.taxRate}
                      onChange={(e) => updateItem(idx, "taxRate", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      aria-label={`Eliminar ítem ${idx + 1}`}
                    >
                      <Trash2 className="h-5 w-5 text-red-400" />
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
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales para el cliente"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="h-10 w-full sm:w-auto" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-10 w-full sm:w-auto">
              {loading ? "Guardando..." : "Guardar Factura"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
