"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOrganizationRole } from "@/hooks/use-organization-role";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE" as "ACTIVE" | "COMPLETED" | "ARCHIVED",
    startDate: "",
    endDate: "",
    budget: "",
    color: "#3b82f6",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          color: form.color,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({
          name: "",
          description: "",
          status: "ACTIVE",
          startDate: "",
          endDate: "",
          budget: "",
          color: "#3b82f6",
        });
        window.location.reload();
      } else {
        toast.error("Error al crear proyecto");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const { canEdit } = useOrganizationRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-card">Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nombre *</Label>
            <Input
              id="project-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Rediseño de marca"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Descripción</Label>
            <Input
              id="project-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve descripción del proyecto"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as typeof form.status })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="COMPLETED">Completado</SelectItem>
                  <SelectItem value="ARCHIVED">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="project-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-start">Fecha de inicio</Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-end">Fecha de fin</Label>
              <Input
                id="project-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-budget">Presupuesto (COP)</Label>
            <Input
              id="project-budget"
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Proyecto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
