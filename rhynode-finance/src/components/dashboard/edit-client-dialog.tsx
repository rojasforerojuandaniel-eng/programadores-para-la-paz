"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import type { ClientRow } from "./client-list";

interface EditClientDialogProps {
  client: ClientRow;
  onUpdate: () => void;
  children?: React.ReactNode;
}

export function EditClientDialog({ client, onUpdate, children }: EditClientDialogProps) {
  const t = useTranslations("dashboard.clients");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? "",
    taxId: client.taxId ?? "",
    phone: client.phone ?? "",
    city: client.city ?? "",
    country: client.country ?? "CO",
    status: client.status,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setOpen(false);
        onUpdate();
      } else {
        toast.error(t("editDialog.updateError"));
      }
    } catch {
      toast.error(t("editDialog.networkError"));
    } finally {
      setLoading(false);
    }
  }

  const { canEdit } = useOrganizationRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("list.editClient")}>
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("editDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-client-name">{t("form.name")}</Label>
            <Input
              id="edit-client-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-email">{t("form.email")}</Label>
              <Input
                id="edit-client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t("form.emailPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-taxId">{t("form.taxId")}</Label>
              <Input
                id="edit-client-taxId"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder={t("form.taxIdPlaceholder")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone">{t("form.phone")}</Label>
              <Input
                id="edit-client-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("form.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-city">{t("form.city")}</Label>
              <Input
                id="edit-client-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t("form.cityPlaceholder")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-country">{t("form.country")}</Label>
              <Select
                value={form.country}
                onValueChange={(v) => setForm({ ...form, country: v })}
              >
                <SelectTrigger id="edit-client-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CO">Colombia</SelectItem>
                  <SelectItem value="MX">México</SelectItem>
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="AR">Argentina</SelectItem>
                  <SelectItem value="CL">Chile</SelectItem>
                  <SelectItem value="PE">Perú</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-status">{t("form.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="edit-client-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t("status.ACTIVE" as never)}</SelectItem>
                  <SelectItem value="INACTIVE">{t("status.INACTIVE" as never)}</SelectItem>
                  <SelectItem value="ARCHIVED">{t("status.ARCHIVED" as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("form.saving") : t("form.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
