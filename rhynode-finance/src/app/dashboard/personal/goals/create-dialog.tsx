"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { executeMutation } from "@/lib/offline-queue";

interface CreateGoalDialogProps {
  trigger?: ReactNode;
  defaultOpen?: boolean;
  defaultValues?: {
    name?: string;
    targetAmount?: number;
    currency?: string;
    deadline?: Date;
    icon?: string;
    color?: string;
  };
}

export function CreateGoalDialog({
  trigger,
  defaultOpen = false,
  defaultValues,
}: CreateGoalDialogProps = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    targetAmount: defaultValues?.targetAmount
      ? String(Math.round(defaultValues.targetAmount))
      : "",
    currency: defaultValues?.currency ?? "COP",
    deadline: defaultValues?.deadline
      ? new Date(defaultValues.deadline).toISOString().split("T")[0]
      : "",
    icon: defaultValues?.icon ?? "",
    color: defaultValues?.color ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.targetAmount) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currency: form.currency,
      };
      if (form.deadline) body.deadline = form.deadline;
      if (form.icon) body.icon = form.icon;
      if (form.color) body.color = form.color;

      await executeMutation(
        "/api/personal/goals",
        "POST",
        body,
        {
          onSuccess: () => {
            trackEvent("goal_created", {
              currency: form.currency,
              hasDeadline: Boolean(form.deadline),
            });
            setOpen(false);
            setForm({
              name: "",
              targetAmount: "",
              currency: "COP",
              deadline: "",
              icon: "",
              color: "",
            });
            router.refresh();
            toast.success("Meta creada");
          },
          onError: (err) => {
            toast.error(err.message || "Error al crear meta");
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva Meta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Nueva Meta</DialogTitle>
          <DialogDescription>
            Define el objetivo, monto y fecha límite de la meta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nombre *</Label>
            <Input
              id="goal-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Viaje a Europa"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Monto meta *</Label>
              <Input
                id="goal-target"
                type="number"
                min={0}
                required
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">Fecha límite</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-color">Color</Label>
              <Input
                id="goal-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#00d4ff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-icon">Icono (nombre Lucide)</Label>
              <Input
                id="goal-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="Target"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
